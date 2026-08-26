import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  const productionSecrets = {
    JWT_ACCESS_SECRET: 'a'.repeat(64),
    JWT_ADMIN_SECRET: 'b'.repeat(64),
    OTP_PEPPER: 'c'.repeat(64),
    MESSAGE_SECRET_ENCRYPTION_KEY: 'd'.repeat(64),
  };

  it('requires a database in every environment', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'test' })).toThrow(
      'DATABASE_URL is required',
    );
  });

  it('refuses test payment provider in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://database',
        REDIS_URL: 'redis://redis',
        WEB_ORIGIN: 'https://bestwash.example',
        ...productionSecrets,
        PAYMENT_PROVIDER: 'test',
      }),
    ).toThrow('Production is configured exclusively for Zarinpal.');
  });

  it('refuses weak production secrets', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://database',
        REDIS_URL: 'redis://redis',
        WEB_ORIGIN: 'https://bestwash.example',
        ...productionSecrets,
        JWT_ACCESS_SECRET: 'too-short',
        PAYMENT_PROVIDER: 'zarinpal',
      }),
    ).toThrow('JWT_ACCESS_SECRET must be an independent random secret');
  });

  it('refuses exposing test OTP in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://database',
        REDIS_URL: 'redis://redis',
        WEB_ORIGIN: 'https://bestwash.example',
        ...productionSecrets,
        PAYMENT_PROVIDER: 'zarinpal',
        EXPOSE_TEST_OTP: 'true',
      }),
    ).toThrow('EXPOSE_TEST_OTP must be disabled');
  });
});
