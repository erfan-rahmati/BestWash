import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { BookingCapacityService } from '../src/modules/booking-capacity/booking-capacity.service';

interface HealthResponse {
  status: 'ok';
  service: 'bestwash-api';
  timestamp: string;
}

interface AvailabilityDay {
  date: string;
  isOpen: boolean;
  availableSlots: number;
  firstAvailableTime: string | null;
}

interface AvailabilityDaysResponse {
  data: {
    days: AvailabilityDay[];
  };
}

interface AvailabilitySlot {
  startAt: string;
  isAvailable: boolean;
  remainingCapacity: number;
}

interface AvailabilitySlotsResponse {
  data: {
    slots: AvailabilitySlot[];
  };
}

interface HoldResponse {
  data: {
    token: string;
    status: string;
  };
}

interface CheckoutResponse {
  data: {
    id: string;
    token: string;
    holdId: string;
    status: string;
  };
}

interface CancelCheckoutResponse {
  data: {
    token: string;
    status: string;
  };
}

interface CatalogFixture {
  modelId: string;
  vehicleClassId: string;
  vehicleType: 'CAR' | 'MOTORCYCLE';
  packageId: string;
  durationMinutes: number;
}

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const body = value as Record<string, unknown>;

  return (
    body.status === 'ok' &&
    body.service === 'bestwash-api' &&
    typeof body.timestamp === 'string'
  );
}

async function findCatalogFixture(
  prisma: PrismaService,
): Promise<CatalogFixture> {
  const models = await prisma.vehicleModel.findMany({
    where: {
      isActive: true,
      brand: {
        isActive: true,
      },
      vehicleClass: {
        isActive: true,
      },
    },
    orderBy: {
      sortOrder: 'asc',
    },
    take: 50,
    select: {
      id: true,
      vehicleClassId: true,
      vehicleClass: {
        select: {
          vehicleType: true,
        },
      },
    },
  });

  for (const model of models) {
    const servicePackage = await prisma.servicePackage.findFirst({
      where: {
        isActive: true,
        prices: {
          some: {
            vehicleClassId: model.vehicleClassId,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        durationMinutes: true,
      },
    });

    if (!servicePackage) {
      continue;
    }

    return {
      modelId: model.id,
      vehicleClassId: model.vehicleClassId,
      vehicleType: model.vehicleClass.vehicleType,
      packageId: servicePackage.id,
      durationMinutes: servicePackage.durationMinutes,
    };
  }

  throw new Error(
    'E2E fixture not found. Seed vehicle and service catalog before running tests.',
  );
}

async function createAvailableHold(
  httpServer: Server,
  fixture: CatalogFixture,
): Promise<HoldResponse['data']> {
  const daysResponse: Response = await request(httpServer)
    .get('/api/v1/availability/days')
    .query({
      durationMinutes: fixture.durationMinutes,
    })
    .expect(200);

  const daysBody = daysResponse.body as AvailabilityDaysResponse;

  for (const day of daysBody.data.days) {
    if (!day.isOpen || day.availableSlots <= 0) {
      continue;
    }

    const slotsResponse: Response = await request(httpServer)
      .get('/api/v1/availability/slots')
      .query({
        date: day.date,
        durationMinutes: fixture.durationMinutes,
      })
      .expect(200);

    const slotsBody = slotsResponse.body as AvailabilitySlotsResponse;

    for (const slot of slotsBody.data.slots) {
      if (!slot.isAvailable || slot.remainingCapacity <= 0) {
        continue;
      }

      const holdResponse: Response = await request(httpServer)
        .post('/api/v1/booking-holds')
        .send({
          vehicleClassId: fixture.vehicleClassId,
          packageId: fixture.packageId,
          addonIds: [],
          startAt: slot.startAt,
        });

      if (holdResponse.status === 201) {
        const holdBody = holdResponse.body as HoldResponse;

        return holdBody.data;
      }

      /*
       * Another process may have taken this slot between the availability
       * read and Hold creation. Try the next free slot instead of making
       * the regression test flaky.
       */
      if (holdResponse.status === 409) {
        continue;
      }

      throw new Error(
        `Unexpected Hold response ${holdResponse.status}: ${JSON.stringify(
          holdResponse.body,
        )}`,
      );
    }
  }

  throw new Error(
    'No available booking slot was found for the E2E concurrency test.',
  );
}

describe('BestWash API (e2e)', () => {
  let app: INestApplication<Server>;

  let prisma: PrismaService;

  let bookingCapacityService: BookingCapacityService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<INestApplication<Server>>();

    configureApp(app);

    await app.init();

    prisma = app.get(PrismaService);

    bookingCapacityService = app.get(BookingCapacityService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health', async () => {
    const httpServer = app.getHttpServer();

    const response: Response = await request(httpServer)
      .get('/api/v1/health')
      .expect(200);

    const body: unknown = response.body;

    expect(isHealthResponse(body)).toBe(true);

    if (!isHealthResponse(body)) {
      throw new Error('Invalid health response payload.');
    }

    expect(body.status).toBe('ok');

    expect(body.service).toBe('bestwash-api');

    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('creates exactly one Checkout when two concurrent requests target the same Hold', async () => {
    const httpServer = app.getHttpServer();

    let holdId: string | null = null;

    let holdToken: string | null = null;

    try {
      const fixture = await findCatalogFixture(prisma);

      const createdHold = await createAvailableHold(httpServer, fixture);

      holdToken = createdHold.token;

      expect(createdHold.status).toBe('ACTIVE');

      const holdRecord = await prisma.bookingHold.findUnique({
        where: {
          token: holdToken,
        },
        select: {
          id: true,
          status: true,
        },
      });

      expect(holdRecord).not.toBeNull();

      if (!holdRecord) {
        throw new Error('Created Hold could not be loaded from database.');
      }

      holdId = holdRecord.id;

      expect(holdRecord.status).toBe('ACTIVE');

      const plate =
        fixture.vehicleType === 'MOTORCYCLE'
          ? {
              type: 'IRAN_MOTORCYCLE' as const,
              motorcycleTop: '123',
              motorcycleBottom: '45678',
            }
          : {
              type: 'IRAN_CAR' as const,
              firstTwo: '83',
              letter: 'م',
              middleThree: '143',
              iranCode: '82',
            };

      const checkoutPayload = {
        holdToken,
        vehicle: {
          sourceMode: 'CATALOG',
          modelId: fixture.modelId,
          color: 'سفید',
          productionYear: 1404,
          nickname: 'E2E concurrency test',
          plate,
        },
      };

      /*
       * This is the regression scenario that previously caused:
       *
       * request A -> Checkout created
       * request B -> Prisma P2034/P2002 -> HTTP 409
       * frontend -> incorrectly treated 409 as expiration
       *
       * Both HTTP requests must now resolve successfully to exactly
       * the same Checkout.
       */
      const [firstResponse, secondResponse] = await Promise.all([
        request(httpServer)
          .post('/api/v1/booking-checkouts')
          .send(checkoutPayload),

        request(httpServer)
          .post('/api/v1/booking-checkouts')
          .send(checkoutPayload),
      ]);

      expect(firstResponse.status).toBe(201);

      expect(secondResponse.status).toBe(201);

      const firstBody = firstResponse.body as CheckoutResponse;

      const secondBody = secondResponse.body as CheckoutResponse;

      expect(firstBody.data.status).toBe('PENDING');

      expect(secondBody.data.status).toBe('PENDING');

      expect(firstBody.data.id).toBe(secondBody.data.id);

      expect(firstBody.data.token).toBe(secondBody.data.token);

      expect(firstBody.data.holdId).toBe(holdId);

      expect(secondBody.data.holdId).toBe(holdId);

      const [checkoutCount, bookingCount, holdBucketCount, activeHold] =
        await Promise.all([
          prisma.bookingCheckout.count({
            where: {
              holdId,
            },
          }),

          prisma.booking.count({
            where: {
              holdId,
            },
          }),

          prisma.bookingHoldBucket.count({
            where: {
              holdId,
            },
          }),

          prisma.bookingHold.findUnique({
            where: {
              id: holdId,
            },
            select: {
              status: true,
            },
          }),
        ]);

      expect(checkoutCount).toBe(1);

      expect(bookingCount).toBe(0);

      expect(holdBucketCount).toBeGreaterThan(0);

      expect(activeHold?.status).toBe('ACTIVE');

      const cancelResponse: Response = await request(httpServer)
        .delete(
          `/api/v1/booking-checkouts/${encodeURIComponent(
            firstBody.data.token,
          )}`,
        )
        .expect(200);

      const cancelBody = cancelResponse.body as CancelCheckoutResponse;

      expect(cancelBody.data.status).toBe('CANCELLED');

      const [
        cancelledHold,
        cancelledCheckout,
        remainingHoldBuckets,
        finalBookingCount,
      ] = await Promise.all([
        prisma.bookingHold.findUnique({
          where: {
            id: holdId,
          },
          select: {
            status: true,
          },
        }),

        prisma.bookingCheckout.findUnique({
          where: {
            holdId,
          },
          select: {
            status: true,
          },
        }),

        prisma.bookingHoldBucket.count({
          where: {
            holdId,
          },
        }),

        prisma.booking.count({
          where: {
            holdId,
          },
        }),
      ]);

      expect(cancelledHold?.status).toBe('CANCELLED');

      expect(cancelledCheckout?.status).toBe('CANCELLED');

      expect(remainingHoldBuckets).toBe(0);

      expect(finalBookingCount).toBe(0);
    } finally {
      /*
       * The test uses the real development PostgreSQL database.
       * Clean only the records created by this test.
       *
       * Capacity bucket rows may remain with usedCapacity = 0 because
       * they are shared schedule infrastructure and should not be
       * destructively removed here.
       */
      if (holdId) {
        const currentHold = await prisma.bookingHold.findUnique({
          where: {
            id: holdId,
          },
          select: {
            status: true,
          },
        });

        if (currentHold?.status === 'ACTIVE') {
          await bookingCapacityService.releaseHoldById(holdId, 'CANCELLED');
        }

        const bookingCount = await prisma.booking.count({
          where: {
            holdId,
          },
        });

        if (bookingCount === 0) {
          await prisma.bookingCheckout.deleteMany({
            where: {
              holdId,
            },
          });

          await prisma.bookingHoldBucket.deleteMany({
            where: {
              holdId,
            },
          });

          await prisma.bookingHold.deleteMany({
            where: {
              id: holdId,
              status: {
                in: ['CANCELLED', 'EXPIRED'],
              },
            },
          });
        }
      }
    }
  });
});
