const requiredProductionKeys = [
  'DATABASE_URL',
  'REDIS_URL',
  'WEB_ORIGIN',
  'JWT_ACCESS_SECRET',
  'JWT_ADMIN_SECRET',
  'OTP_PEPPER',
  'MESSAGE_SECRET_ENCRYPTION_KEY',
] as const;

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const environment =
    typeof config.NODE_ENV === 'string' ? config.NODE_ENV : 'development';

  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  if (environment === 'production') {
    const missing = requiredProductionKeys.filter((key) => !config[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing production environment keys: ${missing.join(', ')}`,
      );
    }
    if (String(config.PAYMENT_PROVIDER) !== 'zarinpal') {
      throw new Error('Production is configured exclusively for Zarinpal.');
    }

    if (String(config.EXPOSE_TEST_OTP) === 'true') {
      throw new Error('EXPOSE_TEST_OTP must be disabled in production.');
    }

    const secretKeys = [
      'JWT_ACCESS_SECRET',
      'JWT_ADMIN_SECRET',
      'OTP_PEPPER',
      'MESSAGE_SECRET_ENCRYPTION_KEY',
    ] as const;
    const secrets = secretKeys.map((key) => String(config[key]));
    for (const [index, secret] of secrets.entries()) {
      if (
        secret.length < 64 ||
        /change|replace|development|example|password|secret/i.test(secret)
      ) {
        throw new Error(
          `${secretKeys[index]} must be an independent random secret of at least 64 characters.`,
        );
      }
    }
    if (new Set(secrets).size !== secrets.length) {
      throw new Error('Production security secrets must be independent.');
    }

    const origins = String(config.WEB_ORIGIN)
      .split(',')
      .map((origin) => origin.trim());
    if (
      origins.some(
        (origin) =>
          !origin.startsWith('https://') ||
          /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(origin),
      )
    ) {
      throw new Error('WEB_ORIGIN must contain only production HTTPS origins.');
    }
  }

  return config;
}
