import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PaymentProviderAdapter,
  PaymentRequestInput,
  PaymentRequestResult,
  PaymentVerifyResult,
} from './payment-provider.interface';

interface ZibalResponse {
  result?: number;
  message?: string;
  trackId?: number | string;
  amount?: number;
  refNumber?: string | number;
}

@Injectable()
export class ZibalPaymentProvider implements PaymentProviderAdapter {
  readonly name = 'ZIBAL' as const;
  private readonly baseUrl = 'https://gateway.zibal.ir/v1';

  constructor(private readonly config: ConfigService) {}

  private async post(
    path: string,
    body: Record<string, unknown>,
  ): Promise<ZibalResponse> {
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = (await response.json()) as ZibalResponse;
    if (!response.ok) {
      throw new BadGatewayException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'درگاه پرداخت در دسترس نیست.',
      });
    }
    return payload;
  }

  async request(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const raw = await this.post('request', {
      merchant: this.config.getOrThrow<string>('ZIBAL_MERCHANT'),
      amount: input.amountRial,
      callbackUrl: input.callbackUrl,
      orderId: input.paymentId,
      mobile: input.mobile,
      description: input.description,
    });
    if (raw.result !== 100 || !raw.trackId) {
      throw new BadGatewayException({
        code: 'PAYMENT_REQUEST_REJECTED',
        message: raw.message ?? 'درخواست پرداخت توسط زیبال رد شد.',
      });
    }
    const trackId = String(raw.trackId);
    return {
      trackId,
      redirectUrl: `https://gateway.zibal.ir/start/${encodeURIComponent(trackId)}`,
      raw: raw as Record<string, unknown>,
    };
  }

  async verify(
    trackId: string,
    expectedAmountRial: number,
  ): Promise<PaymentVerifyResult> {
    const raw = await this.post('verify', {
      merchant: this.config.getOrThrow<string>('ZIBAL_MERCHANT'),
      trackId,
    });
    return {
      success:
        (raw.result === 100 || raw.result === 201) &&
        raw.amount === expectedAmountRial,
      alreadyVerified: raw.result === 201,
      amountRial: raw.amount,
      referenceNumber: raw.refNumber ? String(raw.refNumber) : undefined,
      raw: raw as Record<string, unknown>,
    };
  }
}
