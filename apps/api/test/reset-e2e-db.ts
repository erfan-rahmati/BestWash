import 'dotenv/config';
import { execSync } from 'node:child_process';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for E2E tests.');
}

const parsedUrl = new URL(testDatabaseUrl);

const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));

if (databaseName !== 'bestwash_test') {
  throw new Error(
    `Refusing to reset unsafe database "${databaseName}". E2E database must be exactly "bestwash_test".`,
  );
}

const env = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
};

function run(command: string): void {
  console.log(`\n[E2E DB] ${command}`);

  execSync(command, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });
}

console.log('');
console.log('========================================');
console.log(' Resetting isolated BestWash E2E DB');
console.log(` Database: ${databaseName}`);
console.log('========================================');

run('pnpm exec prisma migrate reset --force');

run('pnpm exec tsx prisma/seed.ts');

run('pnpm exec tsx prisma/seed-service-catalog.ts');

run('pnpm exec tsx prisma/seed-booking-schedule.ts');

console.log('');
console.log('BestWash E2E database is ready.');
