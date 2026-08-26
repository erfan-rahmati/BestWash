import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BookingCapacityService {
  constructor(private readonly prisma: PrismaService) {}

  async releaseExpiredHolds() {
    const now = new Date();

    const expiredHolds = await this.prisma.bookingHold.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
      take: 100,
    });

    for (const hold of expiredHolds) {
      await this.releaseHoldById(hold.id, 'EXPIRED');
    }
  }

  async releaseHoldById(holdId: string, nextStatus: 'CANCELLED' | 'EXPIRED') {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.bookingHold.updateMany({
        where: {
          id: holdId,
          status: 'ACTIVE',
        },
        data: {
          status: nextStatus,
        },
      });

      if (claimed.count === 0) {
        return false;
      }

      /*
       * Hold and Checkout lifecycle must move together.
       * This prevents states such as:
       *
       * Hold     = EXPIRED/CANCELLED
       * Checkout = PENDING
       */
      await tx.bookingCheckout.updateMany({
        where: {
          holdId,
          status: {
            in: ['PENDING', 'FAILED'],
          },
        },
        data: {
          status: nextStatus,
        },
      });

      const allocations = await tx.bookingHoldBucket.findMany({
        where: {
          holdId,
        },
        select: {
          startsAt: true,
        },
      });

      for (const allocation of allocations) {
        await tx.bookingCapacityBucket.updateMany({
          where: {
            startsAt: allocation.startsAt,
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
      }

      await tx.bookingHoldBucket.deleteMany({
        where: {
          holdId,
        },
      });

      return true;
    });
  }
}
