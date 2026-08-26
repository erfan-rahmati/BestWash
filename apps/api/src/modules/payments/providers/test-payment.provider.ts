import { Injectable } from '@nestjs/common';
import type {
  PaymentProviderAdapter,
  PaymentRequestInput,
  PaymentRequestResult,
  PaymentVerifyResult,
} from './payment-provider.interface';

@Injectable()
export class TestPaymentProvider implements PaymentProviderAdapter {
  readonly name = 'TEST' as const;

  request(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const trackId = `test_${input.paymentId}`;
    return Promise.resolve({
      trackId,
      redirectUrl: `/payment/test?paymentId=${encodeURIComponent(input.paymentId)}`,
      raw: { result: 100, trackId, sandbox: true },
    });
  }

  verify(
    trackId: string,
    expectedAmountRial: number,
  ): Promise<PaymentVerifyResult> {
    return Promise.resolve({
      success: trackId.startsWith('test_'),
      amountRial: expectedAmountRial,
      referenceNumber: `TEST-${Date.now()}`,
      raw: { result: 100, trackId, amount: expectedAmountRial, sandbox: true },
    });
  }
}
