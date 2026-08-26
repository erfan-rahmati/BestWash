import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PaymentProviderAdapter,
  PaymentRequestInput,
  PaymentRequestResult,
  PaymentVerifyResult,
} from './payment-provider.interface';

interface ZarinpalData {
  code?: number;
  message?: string;
  authority?: string;
  ref_id?: number;
}

interface ZarinpalResponse {
  data?: ZarinpalData;
  errors?: Array<{ code?: number; message?: string }> | Record<string, unknown>;
}

@Injectable()
export class ZarinpalPaymentProvider implements PaymentProviderAdapter {
  readonly name = 'ZARINPAL' as const;

  constructor(private readonly config: ConfigService) {}

  private sandbox(): boolean {
    return this.config.get<string>('ZARINPAL_SANDBOX') !== 'false';
  }

  private apiBase(): string {
    return this.sandbox()
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://payment.zarinpal.com/pg/v4/payment';
  }

  private startBase(): string {
    return this.sandbox()
      ? 'https://sandbox.zarinpal.com/pg/StartPay/'
      : 'https://payment.zarinpal.com/pg/StartPay/';
  }

  private async post(
    path: 'request' | 'verify',
    body: Record<string, unknown>,
  ) {
    const response = await fetch(`${this.apiBase()}/${path}.json`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = (await response.json()) as ZarinpalResponse;
    if (!response.ok) {
      throw new BadGatewayException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'سرویس پرداخت زرین‌پال در دسترس نیست.',
      });
    }
    return payload;
  }

  async request(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const raw = await this.post('request', {
      merchant_id: this.config.getOrThrow<string>('ZARINPAL_MERCHANT_ID'),
      amount: input.amountRial,
      currency: 'IRR',
      callback_url: input.callbackUrl,
      description: input.description,
      metadata: {
        mobile: input.mobile?.replace(/^\+98/, '0'),
        order_id: input.paymentId,
      },
    });
    const authority = raw.data?.authority;
    if (raw.data?.code !== 100 || !authority) {
      throw new BadGatewayException({
        code: 'PAYMENT_REQUEST_REJECTED',
        message: raw.data?.message ?? 'درخواست پرداخت توسط زرین‌پال رد شد.',
      });
    }
    return {
      trackId: authority,
      redirectUrl: `${this.startBase()}${encodeURIComponent(authority)}`,
      raw: raw as unknown as Record<string, unknown>,
    };
  }

  async verify(
    authority: string,
    expectedAmountRial: number,
  ): Promise<PaymentVerifyResult> {
    const raw = await this.post('verify', {
      merchant_id: this.config.getOrThrow<string>('ZARINPAL_MERCHANT_ID'),
      amount: expectedAmountRial,
      authority,
    });
    const code = raw.data?.code;
    return {
      success: code === 100 || code === 101,
      alreadyVerified: code === 101,
      amountRial: expectedAmountRial,
      referenceNumber: raw.data?.ref_id ? String(raw.data.ref_id) : undefined,
      raw: raw as unknown as Record<string, unknown>,
    };
  }
}
