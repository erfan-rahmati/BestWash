import { TestPaymentProvider } from './test-payment.provider';

describe('TestPaymentProvider', () => {
  const provider = new TestPaymentProvider();

  it('creates a local test redirect', async () => {
    const result = await provider.request({
      paymentId: 'payment 1',
      amountRial: 500_000,
      callbackUrl: 'http://localhost/callback',
      description: 'test',
    });
    expect(result.trackId).toBe('test_payment 1');
    expect(result.redirectUrl).toBe('/payment/test?paymentId=payment%201');
  });

  it('accepts only test track identifiers', async () => {
    await expect(provider.verify('test_123', 500_000)).resolves.toMatchObject({
      success: true,
      amountRial: 500_000,
    });
    await expect(provider.verify('other_123', 500_000)).resolves.toMatchObject({
      success: false,
    });
  });
});
