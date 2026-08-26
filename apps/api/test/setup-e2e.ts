import 'dotenv/config';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for E2E tests.');
}

const parsedUrl = new URL(testDatabaseUrl);

const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));

if (databaseName !== 'bestwash_test') {
  throw new Error(
    `Unsafe E2E database "${databaseName}". Expected "bestwash_test".`,
  );
}

/*
 * AppModule and PrismaService use DATABASE_URL.
 * During E2E execution we deliberately redirect them to the isolated
 * disposable test database.
 */
process.env.DATABASE_URL = testDatabaseUrl;
