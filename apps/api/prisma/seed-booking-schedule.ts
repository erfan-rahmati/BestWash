import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const OPEN_MINUTE = 8 * 60;
const CLOSE_MINUTE = 21 * 60 + 30;

async function main() {
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    await prisma.bookingScheduleRule.upsert({
      where: {
        weekday,
      },
      update: {
        isOpen: true,
        openMinute: OPEN_MINUTE,
        closeMinute: CLOSE_MINUTE,
        capacity: 1,
        slotStepMinutes: 30,
      },
      create: {
        weekday,
        isOpen: true,
        openMinute: OPEN_MINUTE,
        closeMinute: CLOSE_MINUTE,
        capacity: 1,
        slotStepMinutes: 30,
      },
    });
  }

  console.log('BestWash booking schedule seed completed.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
