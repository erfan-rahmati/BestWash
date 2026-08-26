export interface PaymentRequestInput {
  paymentId: string;
  amountRial: number;
  callbackUrl: string;
  mobile?: string;
  description: string;
}

export interface PaymentRequestResult {
  trackId: string;
  redirectUrl: string;
  raw: Record<string, unknown>;
}

export interface PaymentVerifyResult {
  success: boolean;
  alreadyVerified?: boolean;
  amountRial?: number;
  referenceNumber?: string;
  raw: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  readonly name: 'ZIBAL' | 'ZARINPAL' | 'TEST';
  request(input: PaymentRequestInput): Promise<PaymentRequestResult>;
  verify(
    trackId: string,
    expectedAmountRial: number,
  ): Promise<PaymentVerifyResult>;
}
