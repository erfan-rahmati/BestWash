import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { PrismaService } from '../../database/prisma.service';
import { BookingCapacityService } from '../booking-capacity/booking-capacity.service';
import { calculateCapacityDurationMinutes } from '../booking-capacity/booking-capacity-policy';

interface DaySchedule {
  date: string;
  isOpen: boolean;
  openMinute: number;
  closeMinute: number;
  capacity: number;
  slotStepMinutes: number;
  reason: string | null;
}

@Injectable()
export class AvailabilityService {
  private readonly timezone: string;
  private readonly windowDays: number;
  private readonly leadMinutes: number;
  private readonly bucketMinutes: number;
  private readonly overlapToleranceMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly bookingCapacityService: BookingCapacityService,
  ) {
    this.timezone =
      this.configService.get<string>('BUSINESS_TIMEZONE') ?? 'Asia/Tehran';

    this.windowDays = Number(
      this.configService.get<string>('BOOKING_WINDOW_DAYS') ?? '14',
    );

    this.leadMinutes = Number(
      this.configService.get<string>('MIN_BOOKING_LEAD_MINUTES') ?? '30',
    );

    this.bucketMinutes = Number(
      this.configService.get<string>('CAPACITY_BUCKET_MINUTES') ?? '15',
    );
    this.overlapToleranceMinutes = Number(
      this.configService.get<string>('BOOKING_OVERLAP_TOLERANCE_MINUTES') ??
        '10',
    );
  }

  private parseDuration(durationMinutes: number) {
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      durationMinutes > 8 * 60
    ) {
      throw new BadRequestException('Invalid durationMinutes.');
    }

    return durationMinutes;
  }

  private parseLocalDate(date: string) {
    const parsed = DateTime.fromISO(date, {
      zone: this.timezone,
    }).startOf('day');

    if (!parsed.isValid || parsed.toISODate() !== date) {
      throw new BadRequestException('Date must use YYYY-MM-DD format.');
    }

    return parsed;
  }

  private async getDaySchedule(localDate: DateTime): Promise<DaySchedule> {
    const weekday = localDate.weekday;

    const [rule, override] = await Promise.all([
      this.prisma.bookingScheduleRule.findUnique({
        where: {
          weekday,
        },
      }),
      this.prisma.bookingScheduleOverride.findUnique({
        where: {
          localDate: DateTime.utc(
            localDate.year,
            localDate.month,
            localDate.day,
          ).toJSDate(),
        },
      }),
    ]);

    const date = localDate.toISODate();

    if (!date) {
      throw new BadRequestException('Invalid local date.');
    }

    if (!rule || !rule.isOpen) {
      return {
        date,
        isOpen: false,
        openMinute: 0,
        closeMinute: 0,
        capacity: 0,
        slotStepMinutes: 30,
        reason: 'در این روز پذیرش انجام نمی‌شود.',
      };
    }

    if (override?.isClosed) {
      return {
        date,
        isOpen: false,
        openMinute: 0,
        closeMinute: 0,
        capacity: 0,
        slotStepMinutes: rule.slotStepMinutes,
        reason: override.note ?? 'این روز تعطیل است.',
      };
    }

    return {
      date,
      isOpen: true,
      openMinute: override?.openMinute ?? rule.openMinute,
      closeMinute: override?.closeMinute ?? rule.closeMinute,
      capacity: override?.capacity ?? rule.capacity,
      slotStepMinutes: rule.slotStepMinutes,
      reason: override?.note ?? null,
    };
  }

  private async buildSlots(localDate: DateTime, durationMinutes: number) {
    const schedule = await this.getDaySchedule(localDate);

    if (!schedule.isOpen) {
      return {
        schedule,
        slots: [],
      };
    }

    const capacityDurationMinutes = calculateCapacityDurationMinutes(
      durationMinutes,
      this.bucketMinutes,
      this.overlapToleranceMinutes,
    );

    const dayStart = localDate.startOf('day');

    const utcStart = dayStart.toUTC();

    const utcEnd = dayStart
      .plus({
        days: 1,
      })
      .toUTC();

    const [buckets, timeBlocks] = await Promise.all([
      this.prisma.bookingCapacityBucket.findMany({
        where: {
          startsAt: {
            gte: utcStart.toJSDate(),
            lt: utcEnd.toJSDate(),
          },
        },
        orderBy: {
          startsAt: 'asc',
        },
      }),
      this.prisma.bookingScheduleTimeBlock.findMany({
        where: {
          localDate: DateTime.utc(
            localDate.year,
            localDate.month,
            localDate.day,
          ).toJSDate(),
        },
        orderBy: { startMinute: 'asc' },
      }),
    ]);

    const bucketMap = new Map(
      buckets.map((bucket) => [
        DateTime.fromJSDate(bucket.startsAt, {
          zone: 'utc',
        }).toISO(),
        bucket,
      ]),
    );

    const now = DateTime.now().setZone(this.timezone);

    const minimumStart = now.plus({
      minutes: this.leadMinutes,
    });

    const slots = [];

    for (
      let startMinute = schedule.openMinute;
      startMinute + durationMinutes <= schedule.closeMinute;
      startMinute += schedule.slotStepMinutes
    ) {
      const startsAt = dayStart.plus({
        minutes: startMinute,
      });

      if (startsAt < minimumStart) {
        continue;
      }

      let remainingCapacity = schedule.capacity;
      const blockedByAdmin = timeBlocks.find(
        (block) =>
          block.startMinute < startMinute + durationMinutes &&
          block.endMinute > startMinute,
      );

      if (blockedByAdmin) {
        remainingCapacity = 0;
      } else {
        for (
          let offset = 0;
          offset < capacityDurationMinutes;
          offset += this.bucketMinutes
        ) {
          const bucketStart = startsAt
            .plus({
              minutes: offset,
            })
            .toUTC();

          const key = bucketStart.toISO();

          if (!key) {
            continue;
          }

          const bucket = bucketMap.get(key);

          const bucketCapacity = bucket
            ? Math.min(bucket.capacity, schedule.capacity)
            : schedule.capacity;

          const bucketRemaining = Math.max(
            0,
            bucketCapacity - (bucket?.usedCapacity ?? 0),
          );

          remainingCapacity = Math.min(remainingCapacity, bucketRemaining);
        }
      }

      const endsAt = startsAt.plus({
        minutes: durationMinutes,
      });

      slots.push({
        startAt: startsAt.toUTC().toISO(),
        endAt: endsAt.toUTC().toISO(),
        localDate: startsAt.toISODate(),
        localTime: startsAt.toFormat('HH:mm'),
        remainingCapacity,
        isAvailable: remainingCapacity > 0,
        reason: blockedByAdmin?.reason ?? null,
      });
    }

    return {
      schedule,
      slots,
    };
  }

  async getDays(
    from: string | undefined,
    requestedDays: number | undefined,
    durationMinutes: number,
  ) {
    await this.bookingCapacityService.releaseExpiredHolds();

    const duration = this.parseDuration(durationMinutes);

    const today = DateTime.now().setZone(this.timezone).startOf('day');

    const fromDate = from ? this.parseLocalDate(from) : today;

    if (fromDate < today) {
      throw new BadRequestException('Past dates are not bookable.');
    }

    const days = requestedDays ?? this.windowDays;

    if (!Number.isInteger(days) || days < 1 || days > this.windowDays) {
      throw new BadRequestException(
        `days must be between 1 and ${this.windowDays}.`,
      );
    }

    const result = [];

    for (let index = 0; index < days; index += 1) {
      const localDate = fromDate.plus({
        days: index,
      });

      const { schedule, slots } = await this.buildSlots(localDate, duration);

      result.push({
        date: schedule.date,
        isOpen: schedule.isOpen,
        reason: schedule.reason,
        availableSlots: slots.filter((slot) => slot.remainingCapacity > 0)
          .length,
        firstAvailableTime:
          slots.find((slot) => slot.remainingCapacity > 0)?.localTime ?? null,
      });
    }

    return {
      timezone: this.timezone,
      durationMinutes: duration,
      days: result,
    };
  }

  async getSlots(date: string, durationMinutes: number) {
    await this.bookingCapacityService.releaseExpiredHolds();

    const duration = this.parseDuration(durationMinutes);

    const localDate = this.parseLocalDate(date);

    const today = DateTime.now().setZone(this.timezone).startOf('day');

    const lastBookableDate = today.plus({
      days: this.windowDays - 1,
    });

    if (localDate < today || localDate > lastBookableDate) {
      throw new BadRequestException('Date is outside the booking window.');
    }

    const { schedule, slots } = await this.buildSlots(localDate, duration);

    return {
      timezone: this.timezone,
      date: schedule.date,
      isOpen: schedule.isOpen,
      reason: schedule.reason,
      durationMinutes: duration,
      openMinute: schedule.openMinute,
      closeMinute: schedule.closeMinute,
      slots,
    };
  }
}
