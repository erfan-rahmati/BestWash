import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { DateTime } from 'luxon';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BookingCapacityService } from '../booking-capacity/booking-capacity.service';

type VehicleSourceInput = 'CATALOG' | 'CUSTOM';

type PlateTypeInput = 'IRAN_CAR' | 'IRAN_MOTORCYCLE';

interface BookingPlateInput {
  type?: PlateTypeInput;

  firstTwo?: string;
  letter?: string;
  middleThree?: string;
  iranCode?: string;

  motorcycleTop?: string;
  motorcycleBottom?: string;
}

export interface BookingVehicleInput {
  sourceMode?: VehicleSourceInput;

  modelId?: string;

  customBrand?: string;
  customModel?: string;

  color?: string;

  productionYear?: string | number | null;

  nickname?: string | null;

  plate?: BookingPlateInput;
}

export interface CreateBookingInput {
  holdToken?: string;
  vehicle?: BookingVehicleInput;
}

interface ValidatedPlate {
  type: PlateTypeInput;
  normalized: string;

  firstTwo: string | null;
  letter: string | null;
  middleThree: string | null;
  iranCode: string | null;

  motorcycleTop: string | null;
  motorcycleBottom: string | null;
}

const IRAN_CAR_LETTERS = new Set([
  'ب',
  'ج',
  'د',
  'س',
  'ص',
  'ط',
  'ق',
  'ل',
  'م',
  'ن',
  'و',
  'ه',
  'ی',
]);

@Injectable()
export class BookingsService {
  private readonly timezone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly bookingCapacityService: BookingCapacityService,
  ) {
    this.timezone =
      this.configService.get<string>('BUSINESS_TIMEZONE') ?? 'Asia/Tehran';
  }

  private normalizeDigits(value: string): string {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';

    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

    return value
      .trim()
      .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
  }

  private requiredText(
    value: string | undefined,
    fieldName: string,
    maxLength = 100,
  ): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    if (normalized.length > maxLength) {
      throw new BadRequestException(`${fieldName} is too long.`);
    }

    return normalized;
  }

  private optionalText(
    value: string | null | undefined,
    maxLength = 100,
  ): string | null {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      return null;
    }

    if (normalized.length > maxLength) {
      throw new BadRequestException('Text value is too long.');
    }

    return normalized;
  }

  private parseProductionYear(
    value: string | number | null | undefined,
  ): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const normalized =
      typeof value === 'number' ? value : Number(this.normalizeDigits(value));

    if (
      !Number.isInteger(normalized) ||
      normalized < 1200 ||
      normalized > 2200
    ) {
      throw new BadRequestException('productionYear is invalid.');
    }

    return normalized;
  }

  private validatePlate(
    vehicleType: 'CAR' | 'MOTORCYCLE',
    plate: BookingPlateInput | undefined,
  ): ValidatedPlate {
    if (!plate?.type) {
      throw new BadRequestException('plate.type is required.');
    }

    if (vehicleType === 'CAR') {
      if (plate.type !== 'IRAN_CAR') {
        throw new BadRequestException('Car vehicle requires IRAN_CAR plate.');
      }

      const firstTwo = this.normalizeDigits(plate.firstTwo ?? '');

      const letter = plate.letter?.trim() ?? '';

      const middleThree = this.normalizeDigits(plate.middleThree ?? '');

      const iranCode = this.normalizeDigits(plate.iranCode ?? '');

      if (
        !/^\d{2}$/.test(firstTwo) ||
        !IRAN_CAR_LETTERS.has(letter) ||
        !/^\d{3}$/.test(middleThree) ||
        !/^\d{2}$/.test(iranCode)
      ) {
        throw new BadRequestException('Iran car plate is invalid.');
      }

      return {
        type: 'IRAN_CAR',

        normalized: `${firstTwo}${letter}${middleThree}${iranCode}`,

        firstTwo,
        letter,
        middleThree,
        iranCode,

        motorcycleTop: null,
        motorcycleBottom: null,
      };
    }

    if (plate.type !== 'IRAN_MOTORCYCLE') {
      throw new BadRequestException(
        'Motorcycle requires IRAN_MOTORCYCLE plate.',
      );
    }

    const motorcycleTop = this.normalizeDigits(plate.motorcycleTop ?? '');

    const motorcycleBottom = this.normalizeDigits(plate.motorcycleBottom ?? '');

    if (!/^\d{3}$/.test(motorcycleTop) || !/^\d{5}$/.test(motorcycleBottom)) {
      throw new BadRequestException('Iran motorcycle plate is invalid.');
    }

    return {
      type: 'IRAN_MOTORCYCLE',

      normalized: `${motorcycleTop}${motorcycleBottom}`,

      firstTwo: null,
      letter: null,
      middleThree: null,
      iranCode: null,

      motorcycleTop,
      motorcycleBottom,
    };
  }

  private makeBookingCode(): string {
    const datePart = DateTime.now().setZone(this.timezone).toFormat('yyLLdd');

    const randomPart = randomBytes(5).toString('hex').toUpperCase();

    return `BW-${datePart}-${randomPart}`;
  }

  async create(input: CreateBookingInput) {
    const holdToken = input.holdToken?.trim();

    if (!holdToken) {
      throw new BadRequestException('holdToken is required.');
    }

    if (!input.vehicle) {
      throw new BadRequestException('vehicle is required.');
    }

    await this.bookingCapacityService.releaseExpiredHolds();

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const hold = await tx.bookingHold.findUnique({
            where: {
              token: holdToken,
            },

            include: {
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
                  durationMinutes: true,
                  isActive: true,
                },
              },

              buckets: {
                select: {
                  startsAt: true,
                },

                orderBy: {
                  startsAt: 'asc',
                },
              },

              booking: {
                include: {
                  addons: true,
                  allocations: true,
                },
              },
            },
          });

          if (!hold) {
            throw new NotFoundException('Booking hold not found.');
          }

          if (hold.status === 'CONVERTED' && hold.booking) {
            return hold.booking;
          }

          if (hold.status !== 'ACTIVE') {
            throw new ConflictException(
              `Booking hold is ${hold.status.toLowerCase()}.`,
            );
          }

          const now = new Date();

          if (hold.expiresAt <= now) {
            throw new ConflictException('Booking hold has expired.');
          }

          if (hold.buckets.length === 0) {
            throw new ConflictException(
              'Booking hold has no capacity allocation.',
            );
          }

          const vehicle = input.vehicle!;

          if (
            vehicle.sourceMode !== 'CATALOG' &&
            vehicle.sourceMode !== 'CUSTOM'
          ) {
            throw new BadRequestException('vehicle.sourceMode is invalid.');
          }

          const color = this.requiredText(vehicle.color, 'vehicle.color', 50);

          const productionYear = this.parseProductionYear(
            vehicle.productionYear,
          );

          const nickname = this.optionalText(vehicle.nickname, 50);

          let brandName: string | null = null;

          let modelName = '';

          if (vehicle.sourceMode === 'CATALOG') {
            const modelId = this.requiredText(
              vehicle.modelId,
              'vehicle.modelId',
              100,
            );

            const vehicleModel = await tx.vehicleModel.findUnique({
              where: {
                id: modelId,
              },

              select: {
                id: true,
                nameFa: true,
                isActive: true,
                vehicleClassId: true,

                brand: {
                  select: {
                    nameFa: true,
                    isActive: true,
                  },
                },
              },
            });

            if (
              !vehicleModel ||
              !vehicleModel.isActive ||
              !vehicleModel.brand.isActive
            ) {
              throw new BadRequestException('Vehicle model is not available.');
            }

            if (vehicleModel.vehicleClassId !== hold.vehicleClassId) {
              throw new BadRequestException(
                'Vehicle model does not match held vehicle class.',
              );
            }

            brandName = vehicleModel.brand.nameFa;

            modelName = vehicleModel.nameFa;
          } else {
            brandName = this.requiredText(
              vehicle.customBrand,
              'vehicle.customBrand',
              100,
            );

            modelName = this.requiredText(
              vehicle.customModel,
              'vehicle.customModel',
              100,
            );
          }

          const plate = this.validatePlate(
            hold.vehicleClass.vehicleType,
            vehicle.plate,
          );

          const packagePrice = await tx.servicePackagePrice.findUnique({
            where: {
              packageId_vehicleClassId: {
                packageId: hold.packageId,
                vehicleClassId: hold.vehicleClassId,
              },
            },

            select: {
              amountRial: true,
            },
          });

          if (!packagePrice || !hold.package.isActive) {
            throw new ConflictException(
              'Booking package is no longer available.',
            );
          }

          const addons =
            hold.addonIds.length > 0
              ? await tx.serviceAddon.findMany({
                  where: {
                    id: {
                      in: hold.addonIds,
                    },

                    isActive: true,
                  },

                  select: {
                    id: true,
                    code: true,
                    nameFa: true,
                    durationMinutes: true,

                    prices: {
                      where: {
                        vehicleClassId: hold.vehicleClassId,
                      },

                      select: {
                        amountRial: true,
                      },
                    },
                  },
                })
              : [];

          if (addons.length !== hold.addonIds.length) {
            throw new ConflictException('Booking add-on catalog changed.');
          }

          for (const addon of addons) {
            if (addon.prices.length !== 1) {
              throw new ConflictException(
                'Booking add-on price is unavailable.',
              );
            }
          }

          const recalculatedDuration =
            hold.package.durationMinutes +
            addons.reduce((total, addon) => total + addon.durationMinutes, 0);

          const recalculatedAmount =
            packagePrice.amountRial +
            addons.reduce(
              (total, addon) => total + addon.prices[0].amountRial,
              0,
            );

          if (
            recalculatedDuration !== hold.durationMinutes ||
            recalculatedAmount !== hold.totalAmountRial
          ) {
            throw new ConflictException(
              'Booking catalog changed after the hold was created.',
            );
          }

          const claimed = await tx.bookingHold.updateMany({
            where: {
              id: hold.id,
              status: 'ACTIVE',

              expiresAt: {
                gt: now,
              },
            },

            data: {
              status: 'CONVERTED',
            },
          });

          if (claimed.count !== 1) {
            const existingBooking = await tx.booking.findUnique({
              where: {
                holdId: hold.id,
              },

              include: {
                addons: true,
                allocations: true,
              },
            });

            if (existingBooking) {
              return existingBooking;
            }

            throw new ConflictException(
              'Booking hold changed before confirmation.',
            );
          }

          const booking = await tx.booking.create({
            data: {
              code: this.makeBookingCode(),

              status: 'CONFIRMED',

              paymentStatus: 'UNPAID',

              startsAt: hold.startsAt,

              endsAt: hold.endsAt,

              durationMinutes: hold.durationMinutes,

              totalAmountRial: hold.totalAmountRial,

              vehicleSource: vehicle.sourceMode,

              vehicleType: hold.vehicleClass.vehicleType,

              brandName,
              modelName,
              color,
              productionYear,
              nickname,

              plateType: plate.type,

              plateNormalized: plate.normalized,

              plateFirstTwo: plate.firstTwo,

              plateLetter: plate.letter,

              plateMiddleThree: plate.middleThree,

              plateIranCode: plate.iranCode,

              motorcycleTopThree: plate.motorcycleTop,

              motorcycleBottomFive: plate.motorcycleBottom,

              packageCode: hold.package.code,

              packageNameFa: hold.package.nameFa,

              hold: {
                connect: {
                  id: hold.id,
                },
              },

              vehicleClass: {
                connect: {
                  id: hold.vehicleClassId,
                },
              },

              package: {
                connect: {
                  id: hold.packageId,
                },
              },

              addons: {
                create: addons.map((addon) => ({
                  addonCode: addon.code,

                  addonNameFa: addon.nameFa,

                  durationMinutes: addon.durationMinutes,

                  amountRial: addon.prices[0].amountRial,

                  addon: {
                    connect: {
                      id: addon.id,
                    },
                  },
                })),
              },

              allocations: {
                create: hold.buckets.map((bucket) => ({
                  bucket: {
                    connect: {
                      startsAt: bucket.startsAt,
                    },
                  },
                })),
              },
            },

            include: {
              addons: true,
              allocations: true,
            },
          });

          await tx.bookingHoldBucket.deleteMany({
            where: {
              holdId: hold.id,
            },
          });

          return booking;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Booking changed during confirmation. Please try again.',
        );
      }

      throw error;
    }
  }

  async findByCode(code: string, customerId?: string) {
    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      throw new BadRequestException('Booking code is required.');
    }

    const booking = await this.prisma.booking.findUnique({
      where: {
        code: normalizedCode,
        ...(customerId ? { customerId } : {}),
      },

      include: {
        addons: true,
        allocations: true,
        vehicleClass: {
          select: {
            id: true,
            code: true,
            nameFa: true,
            vehicleType: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    return booking;
  }
}
