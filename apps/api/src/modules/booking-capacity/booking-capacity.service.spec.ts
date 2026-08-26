/// <reference types="jest" />

import type { PrismaService } from '../../database/prisma.service';
import { BookingCapacityService } from './booking-capacity.service';

describe('BookingCapacityService regression', () => {
  let prismaMock: {
    $transaction: jest.Mock;
  };

  let txMock: {
    bookingHold: {
      updateMany: jest.Mock;
    };

    bookingCheckout: {
      updateMany: jest.Mock;
    };

    bookingHoldBucket: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };

    bookingCapacityBucket: {
      updateMany: jest.Mock;
    };
  };

  let service: BookingCapacityService;

  beforeEach(() => {
    txMock = {
      bookingHold: {
        updateMany: jest.fn(),
      },

      bookingCheckout: {
        updateMany: jest.fn(),
      },

      bookingHoldBucket: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },

      bookingCapacityBucket: {
        updateMany: jest.fn(),
      },
    };

    prismaMock = {
      $transaction: jest.fn(
        async (
          callback: (tx: typeof txMock) => Promise<unknown>,
        ): Promise<unknown> => callback(txMock),
      ),
    };

    service = new BookingCapacityService(
      prismaMock as unknown as PrismaService,
    );
  });

  async function expectLifecycleRelease(
    nextStatus: 'CANCELLED' | 'EXPIRED',
  ): Promise<void> {
    const firstBucket = new Date('2026-08-09T05:00:00.000Z');

    const secondBucket = new Date('2026-08-09T05:15:00.000Z');

    txMock.bookingHold.updateMany.mockResolvedValueOnce({
      count: 1,
    });

    txMock.bookingCheckout.updateMany.mockResolvedValueOnce({
      count: 1,
    });

    txMock.bookingHoldBucket.findMany.mockResolvedValueOnce([
      {
        startsAt: firstBucket,
      },
      {
        startsAt: secondBucket,
      },
    ]);

    txMock.bookingCapacityBucket.updateMany.mockResolvedValue({
      count: 1,
    });

    txMock.bookingHoldBucket.deleteMany.mockResolvedValueOnce({
      count: 2,
    });

    const released = await service.releaseHoldById('hold-1', nextStatus);

    expect(released).toBe(true);

    expect(txMock.bookingHold.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'hold-1',
        status: 'ACTIVE',
      },

      data: {
        status: nextStatus,
      },
    });

    expect(txMock.bookingCheckout.updateMany).toHaveBeenCalledWith({
      where: {
        holdId: 'hold-1',

        status: {
          in: ['PENDING', 'FAILED'],
        },
      },

      data: {
        status: nextStatus,
      },
    });

    expect(txMock.bookingCapacityBucket.updateMany).toHaveBeenCalledTimes(2);

    expect(txMock.bookingCapacityBucket.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        startsAt: firstBucket,

        usedCapacity: {
          gt: 0,
        },
      },

      data: {
        usedCapacity: {
          decrement: 1,
        },
      },
    });

    expect(txMock.bookingCapacityBucket.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        startsAt: secondBucket,

        usedCapacity: {
          gt: 0,
        },
      },

      data: {
        usedCapacity: {
          decrement: 1,
        },
      },
    });

    expect(txMock.bookingHoldBucket.deleteMany).toHaveBeenCalledWith({
      where: {
        holdId: 'hold-1',
      },
    });
  }

  it('cancels hold and checkout together and releases all capacity', async () => {
    await expectLifecycleRelease('CANCELLED');
  });

  it('expires hold and checkout together and releases all capacity', async () => {
    await expectLifecycleRelease('EXPIRED');
  });

  it('does not release capacity twice when the hold is no longer active', async () => {
    txMock.bookingHold.updateMany.mockResolvedValueOnce({
      count: 0,
    });

    const released = await service.releaseHoldById('hold-1', 'EXPIRED');

    expect(released).toBe(false);

    expect(txMock.bookingCheckout.updateMany).not.toHaveBeenCalled();

    expect(txMock.bookingHoldBucket.findMany).not.toHaveBeenCalled();

    expect(txMock.bookingCapacityBucket.updateMany).not.toHaveBeenCalled();

    expect(txMock.bookingHoldBucket.deleteMany).not.toHaveBeenCalled();
  });
});
