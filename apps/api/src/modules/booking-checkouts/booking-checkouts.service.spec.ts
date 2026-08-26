/// <reference types="jest" />

import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import type { BookingCapacityService } from '../booking-capacity/booking-capacity.service';
import {
  BookingCheckoutsService,
  type CreateBookingCheckoutInput,
} from './booking-checkouts.service';

function createKnownRequestError(
  code: 'P2002' | 'P2034',
): Prisma.PrismaClientKnownRequestError {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError;

  Object.assign(error, {
    code,
    clientVersion: 'test',
    message: `Prisma test error ${code}`,
    name: 'PrismaClientKnownRequestError',
  });

  return error;
}

describe('BookingCheckoutsService regression', () => {
  const futureDate = () => new Date(Date.now() + 60_000);

  const checkout = {
    id: 'checkout-1',
    token: 'checkout-token-1',
    holdId: 'hold-1',
    customerId: null,
    status: 'PENDING',
    amountRial: 2_400_000,
    vehicleSnapshot: {},
    expiresAt: futureDate(),
    paidAt: null,
    consumedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as const;

  const validInput: CreateBookingCheckoutInput = {
    holdToken: 'hold-token-1',
    vehicle: {
      sourceMode: 'CATALOG',
      modelId: 'model-1',
      color: 'سفید',
      productionYear: 1404,
      nickname: null,
      plate: {
        type: 'IRAN_CAR',
        firstTwo: '83',
        letter: 'م',
        middleThree: '143',
        iranCode: '82',
      },
    },
  };

  let prismaMock: {
    $transaction: jest.Mock;
    bookingHold: {
      findUnique: jest.Mock;
    };
    bookingCheckout: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };

  let capacityMock: {
    releaseExpiredHolds: jest.Mock;
    releaseHoldById: jest.Mock;
  };

  let service: BookingCheckoutsService;

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(),

      bookingHold: {
        findUnique: jest.fn(),
      },

      bookingCheckout: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };

    capacityMock = {
      releaseExpiredHolds: jest.fn().mockResolvedValue(undefined),
      releaseHoldById: jest.fn(),
    };

    service = new BookingCheckoutsService(
      prismaMock as unknown as PrismaService,
      capacityMock as unknown as BookingCapacityService,
    );
  });

  it('returns the existing active checkout instead of creating another one', async () => {
    const txMock = {
      bookingHold: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'hold-1',
          token: 'hold-token-1',
          status: 'ACTIVE',
          expiresAt: futureDate(),
          vehicleClassId: 'class-1',
          totalAmountRial: 2_400_000,

          vehicleClass: {
            id: 'class-1',
            vehicleType: 'CAR',
          },

          checkout,
        }),
      },

      bookingCheckout: {
        create: jest.fn(),
      },
    };

    prismaMock.$transaction.mockImplementationOnce(
      async (
        callback: (tx: typeof txMock) => Promise<unknown>,
      ): Promise<unknown> => callback(txMock),
    );

    const result = await service.create(validInput);

    expect(result).toBe(checkout);

    expect(txMock.bookingCheckout.create).not.toHaveBeenCalled();

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it.each(['P2002', 'P2034'] as const)(
    'recovers the winning checkout after concurrent create race %s',
    async (errorCode) => {
      prismaMock.$transaction.mockRejectedValueOnce(
        createKnownRequestError(errorCode),
      );

      prismaMock.bookingHold.findUnique.mockResolvedValueOnce({
        status: 'ACTIVE',
        expiresAt: futureDate(),
        checkout,
      });

      const result = await service.create(validInput);

      expect(result).toBe(checkout);

      expect(capacityMock.releaseExpiredHolds).toHaveBeenCalledTimes(1);

      expect(prismaMock.bookingHold.findUnique).toHaveBeenCalledWith({
        where: {
          token: 'hold-token-1',
        },
        select: {
          status: true,
          expiresAt: true,
          checkout: true,
        },
      });
    },
  );

  it('reconciles a stale pending checkout when its hold is expired', async () => {
    const staleCheckout = {
      ...checkout,

      status: 'PENDING',

      hold: {
        token: 'hold-token-1',
        status: 'EXPIRED',
        startsAt: new Date(),
        endsAt: new Date(),
        durationMinutes: 40,
        totalAmountRial: 2_400_000,
        expiresAt: new Date(Date.now() - 1_000),

        package: {
          id: 'package-1',
          code: 'FULL',
          nameFa: 'شستشوی کامل',
        },
      },
    };

    const reconciledCheckout = {
      ...staleCheckout,
      status: 'EXPIRED',
    };

    prismaMock.bookingCheckout.findUnique.mockResolvedValueOnce(staleCheckout);

    prismaMock.bookingCheckout.updateMany.mockResolvedValueOnce({
      count: 1,
    });

    prismaMock.bookingCheckout.findUniqueOrThrow.mockResolvedValueOnce(
      reconciledCheckout,
    );

    const result = await service.findByToken('checkout-token-1');

    expect(result.status).toBe('EXPIRED');

    expect(prismaMock.bookingCheckout.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'checkout-1',
        status: {
          in: ['PENDING', 'FAILED'],
        },
      },

      data: {
        status: 'EXPIRED',
      },
    });
  });
});
