import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BookingCapacityService } from '../booking-capacity/booking-capacity.service';
import { calculateCapacityDurationMinutes } from '../booking-capacity/booking-capacity-policy';

interface CreateBookingHoldInput {
  vehicleClassId?: string;
  packageId?: string;
  addonIds?: string[];
  startAt?: string;
}

@Injectable()
export class BookingHoldsService {
  private readonly timezone: string;
  private readonly windowDays: number;
  private readonly leadMinutes: number;
  private readonly bucketMinutes: number;
  private readonly overlapToleranceMinutes: number;
  private readonly holdMinutes: number;

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

    this.holdMinutes = Number(
      this.configService.get<string>('BOOKING_HOLD_MINUTES') ?? '8',
    );
  }

  private assertInput(input: CreateBookingHoldInput) {
    if (!input.vehicleClassId) {
      throw new BadRequestException('vehicleClassId is required.');
    }

    if (!input.packageId) {
      throw new BadRequestException('packageId is required.');
    }

    if (!input.startAt) {
      throw new BadRequestException('startAt is required.');
    }

    if (input.addonIds !== undefined && !Array.isArray(input.addonIds)) {
      throw new BadRequestException('addonIds must be an array.');
    }
  }

  private parseStartAt(value: string) {
    const parsed = DateTime.fromISO(value, {
      setZone: true,
    });

    if (!parsed.isValid) {
      throw new BadRequestException('startAt must be a valid ISO date.');
    }

    return parsed.toUTC();
  }

  async create(input: CreateBookingHoldInput) {
    this.assertInput(input);

    await this.bookingCapacityService.releaseExpiredHolds();

    const vehicleClassId = input.vehicleClassId!;

    const packageId = input.packageId!;

    const startUtc = this.parseStartAt(input.startAt!);

    const addonIds = [...new Set((input.addonIds ?? []).filter(Boolean))];

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const vehicleClass = await tx.vehicleClass.findFirst({
            where: {
              id: vehicleClassId,
              isActive: true,
            },
            select: {
              id: true,
              code: true,
              nameFa: true,
              vehicleType: true,
            },
          });

          if (!vehicleClass) {
            throw new BadRequestException('Vehicle class not found.');
          }

          const servicePackage = await tx.servicePackage.findFirst({
            where: {
              id: packageId,
              isActive: true,
              prices: {
                some: {
                  vehicleClassId,
                },
              },
            },
            select: {
              id: true,
              code: true,
              nameFa: true,
              durationMinutes: true,
              prices: {
                where: {
                  vehicleClassId,
                },
                select: {
                  amountRial: true,
                },
              },
            },
          });

          if (!servicePackage || !servicePackage.prices[0]) {
            throw new BadRequestException(
              'Package is not available for this vehicle class.',
            );
          }

          const addons =
            addonIds.length > 0
              ? await tx.serviceAddon.findMany({
                  where: {
                    id: {
                      in: addonIds,
                    },
                    isActive: true,
                    prices: {
                      some: {
                        vehicleClassId,
                      },
                    },
                  },
                  select: {
                    id: true,
                    code: true,
                    nameFa: true,
                    durationMinutes: true,
                    prices: {
                      where: {
                        vehicleClassId,
                      },
                      select: {
                        amountRial: true,
                      },
                    },
                  },
                })
              : [];

          if (addons.length !== addonIds.length) {
            throw new BadRequestException(
              'One or more add-ons are invalid for this vehicle class.',
            );
          }

          const durationMinutes =
            servicePackage.durationMinutes +
            addons.reduce((total, addon) => total + addon.durationMinutes, 0);

          const totalAmountRial =
            servicePackage.prices[0].amountRial +
            addons.reduce(
              (total, addon) => total + (addon.prices[0]?.amountRial ?? 0),
              0,
            );

          const localStart = startUtc.setZone(this.timezone);

          const now = DateTime.now().setZone(this.timezone);

          const today = now.startOf('day');

          const localDay = localStart.startOf('day');

          const lastBookableDay = today.plus({
            days: this.windowDays - 1,
          });

          if (localDay < today || localDay > lastBookableDay) {
            throw new BadRequestException(
              'Selected time is outside the booking window.',
            );
          }

          if (
            localStart <
            now.plus({
              minutes: this.leadMinutes,
            })
          ) {
            throw new ConflictException('Selected time is no longer bookable.');
          }

          const rule = await tx.bookingScheduleRule.findUnique({
            where: {
              weekday: localStart.weekday,
            },
          });

          if (!rule || !rule.isOpen) {
            throw new ConflictException(
              'Business is closed at the selected time.',
            );
          }

          const override = await tx.bookingScheduleOverride.findUnique({
            where: {
              localDate: DateTime.utc(
                localStart.year,
                localStart.month,
                localStart.day,
              ).toJSDate(),
            },
          });

          if (override?.isClosed) {
            throw new ConflictException('Selected day is closed.');
          }

          const openMinute = override?.openMinute ?? rule.openMinute;

          const closeMinute = override?.closeMinute ?? rule.closeMinute;

          const capacity = override?.capacity ?? rule.capacity;

          if (capacity <= 0) {
            throw new ConflictException('No capacity is available.');
          }

          const startMinute = localStart.hour * 60 + localStart.minute;

          if (
            startMinute < openMinute ||
            (startMinute - openMinute) % rule.slotStepMinutes !== 0
          ) {
            throw new BadRequestException(
              'Selected start time is not a valid booking slot.',
            );
          }

          const capacityDurationMinutes = calculateCapacityDurationMinutes(
            durationMinutes,
            this.bucketMinutes,
            this.overlapToleranceMinutes,
          );

          if (startMinute + durationMinutes > closeMinute) {
            throw new ConflictException(
              'Service does not fit within business hours.',
            );
          }

          const timeBlock = await tx.bookingScheduleTimeBlock.findFirst({
            where: {
              localDate: DateTime.utc(
                localStart.year,
                localStart.month,
                localStart.day,
              ).toJSDate(),
              startMinute: { lt: startMinute + durationMinutes },
              endMinute: { gt: startMinute },
            },
          });
          if (timeBlock) {
            throw new ConflictException({
              code: 'BOOKING_TIME_BLOCKED',
              message:
                timeBlock.reason ??
                'این بازه زمانی توسط مدیریت غیرفعال شده است.',
            });
          }

          const expiresAt = DateTime.utc().plus({
            minutes: this.holdMinutes,
          });

          const hold = await tx.bookingHold.create({
            data: {
              vehicleClassId,
              packageId,
              addonIds,
              startsAt: startUtc.toJSDate(),
              endsAt: startUtc
                .plus({
                  minutes: durationMinutes,
                })
                .toJSDate(),
              durationMinutes,
              totalAmountRial,
              expiresAt: expiresAt.toJSDate(),
            },
          });

          for (
            let offset = 0;
            offset < capacityDurationMinutes;
            offset += this.bucketMinutes
          ) {
            const bucketStart = startUtc
              .plus({
                minutes: offset,
              })
              .toJSDate();

            await tx.bookingCapacityBucket.upsert({
              where: {
                startsAt: bucketStart,
              },
              update: {
                capacity,
              },
              create: {
                startsAt: bucketStart,
                capacity,
                usedCapacity: 0,
              },
            });

            const reserved = await tx.bookingCapacityBucket.updateMany({
              where: {
                startsAt: bucketStart,
                usedCapacity: {
                  lt: capacity,
                },
              },
              data: {
                usedCapacity: {
                  increment: 1,
                },
              },
            });

            if (reserved.count !== 1) {
              throw new ConflictException(
                'Selected time has just reached full capacity.',
              );
            }

            await tx.bookingHoldBucket.create({
              data: {
                holdId: hold.id,
                startsAt: bucketStart,
              },
            });
          }

          return {
            token: hold.token,
            status: hold.status,
            expiresAt: hold.expiresAt,
            startsAt: hold.startsAt,
            endsAt: hold.endsAt,
            durationMinutes,
            totalAmountRial,
            vehicleClass,
            package: {
              id: servicePackage.id,
              code: servicePackage.code,
              nameFa: servicePackage.nameFa,
            },
            addons: addons.map((addon) => ({
              id: addon.id,
              code: addon.code,
              nameFa: addon.nameFa,
            })),
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Booking capacity changed. Please try again.',
        );
      }

      throw error;
    }
  }

  async findByToken(token: string) {
    await this.bookingCapacityService.releaseExpiredHolds();

    const hold = await this.prisma.bookingHold.findUnique({
      where: {
        token,
      },
      select: {
        token: true,
        status: true,
        startsAt: true,
        endsAt: true,
        durationMinutes: true,
        totalAmountRial: true,
        expiresAt: true,
        vehicleClass: {
          select: {
            id: true,
            code: true,
            nameFa: true,
            vehicleType: true,
          },
        },
        package: {
          select: {
            id: true,
            code: true,
            nameFa: true,
          },
        },
        addonIds: true,
      },
    });

    if (!hold) {
      throw new NotFoundException('Booking hold not found.');
    }

    const addons =
      hold.addonIds.length > 0
        ? await this.prisma.serviceAddon.findMany({
            where: {
              id: {
                in: hold.addonIds,
              },
            },
            select: {
              id: true,
              code: true,
              nameFa: true,
            },
          })
        : [];

    return {
      token: hold.token,
      status: hold.status,
      startsAt: hold.startsAt,
      endsAt: hold.endsAt,
      durationMinutes: hold.durationMinutes,
      totalAmountRial: hold.totalAmountRial,
      expiresAt: hold.expiresAt,
      vehicleClass: hold.vehicleClass,
      package: hold.package,
      addons,
    };
  }

  async cancel(token: string) {
    await this.bookingCapacityService.releaseExpiredHolds();

    const hold = await this.prisma.bookingHold.findUnique({
      where: {
        token,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!hold) {
      throw new NotFoundException('Booking hold not found.');
    }

    if (hold.status === 'CANCELLED') {
      return {
        status: 'CANCELLED',
      };
    }

    if (hold.status === 'EXPIRED') {
      return {
        status: 'EXPIRED',
      };
    }

    if (hold.status === 'CONVERTED') {
      throw new BadRequestException('Converted hold cannot be cancelled.');
    }

    await this.bookingCapacityService.releaseHoldById(hold.id, 'CANCELLED');

    return {
      status: 'CANCELLED',
    };
  }
}
