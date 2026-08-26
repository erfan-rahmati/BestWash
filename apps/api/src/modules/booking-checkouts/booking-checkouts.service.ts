import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BookingCapacityService } from '../booking-capacity/booking-capacity.service';

type VehicleSourceInput = 'CATALOG' | 'CUSTOM';

type PlateTypeInput = 'IRAN_CAR' | 'IRAN_MOTORCYCLE';

interface BookingCheckoutPlateInput {
  type?: PlateTypeInput;

  firstTwo?: string;
  letter?: string;
  middleThree?: string;
  iranCode?: string;

  motorcycleTop?: string;
  motorcycleBottom?: string;
}

export interface BookingCheckoutVehicleInput {
  sourceMode?: VehicleSourceInput;

  modelId?: string;

  customBrand?: string;
  customModel?: string;

  color?: string;

  productionYear?: string | number | null;

  nickname?: string | null;

  plate?: BookingCheckoutPlateInput;
}

export interface CreateBookingCheckoutInput {
  holdToken?: string;
  vehicle?: BookingCheckoutVehicleInput;
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
export class BookingCheckoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingCapacityService: BookingCapacityService,
  ) {}

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

  private buildPlateSnapshot(
    vehicleType: 'CAR' | 'MOTORCYCLE',
    plate: BookingCheckoutPlateInput | undefined,
  ): Prisma.InputJsonObject {
    if (!plate?.type) {
      throw new BadRequestException('vehicle.plate.type is required.');
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
      firstTwo: null,
      letter: null,
      middleThree: null,
      iranCode: null,
      motorcycleTop,
      motorcycleBottom,
    };
  }

  private async buildVehicleSnapshot(
    tx: Prisma.TransactionClient,
    vehicleClassId: string,
    vehicleType: 'CAR' | 'MOTORCYCLE',
    vehicle: BookingCheckoutVehicleInput,
  ): Promise<Prisma.InputJsonObject> {
    if (vehicle.sourceMode !== 'CATALOG' && vehicle.sourceMode !== 'CUSTOM') {
      throw new BadRequestException('vehicle.sourceMode is invalid.');
    }

    const color = this.requiredText(vehicle.color, 'vehicle.color', 50);

    const productionYear = this.parseProductionYear(vehicle.productionYear);

    const nickname = this.optionalText(vehicle.nickname, 50);

    const plate = this.buildPlateSnapshot(vehicleType, vehicle.plate);

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
          isActive: true,
          vehicleClassId: true,
          brand: {
            select: {
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

      if (vehicleModel.vehicleClassId !== vehicleClassId) {
        throw new BadRequestException(
          'Vehicle model does not match held vehicle class.',
        );
      }

      return {
        sourceMode: 'CATALOG',
        modelId,
        customBrand: null,
        customModel: null,
        color,
        productionYear,
        nickname,
        plate,
      };
    }

    const customBrand = this.requiredText(
      vehicle.customBrand,
      'vehicle.customBrand',
      100,
    );

    const customModel = this.requiredText(
      vehicle.customModel,
      'vehicle.customModel',
      100,
    );

    return {
      sourceMode: 'CUSTOM',
      modelId: null,
      customBrand,
      customModel,
      color,
      productionYear,
      nickname,
      plate,
    };
  }

  private async synchronizeStatusByToken(token: string) {
    const checkout = await this.prisma.bookingCheckout.findUnique({
      where: {
        token,
      },
      include: {
        hold: {
          select: {
            token: true,
            status: true,
            startsAt: true,
            endsAt: true,
            durationMinutes: true,
            totalAmountRial: true,
            expiresAt: true,
            package: {
              select: {
                id: true,
                code: true,
                nameFa: true,
              },
            },
          },
        },
      },
    });

    if (!checkout) {
      throw new NotFoundException('Booking checkout not found.');
    }

    if (checkout.status !== 'PENDING' && checkout.status !== 'FAILED') {
      return checkout;
    }

    let nextStatus: 'CANCELLED' | 'EXPIRED' | null = null;

    if (checkout.hold.status === 'CANCELLED') {
      nextStatus = 'CANCELLED';
    }

    if (checkout.hold.status === 'EXPIRED') {
      nextStatus = 'EXPIRED';
    }

    if (!nextStatus) {
      return checkout;
    }

    await this.prisma.bookingCheckout.updateMany({
      where: {
        id: checkout.id,
        status: {
          in: ['PENDING', 'FAILED'],
        },
      },
      data: {
        status: nextStatus,
      },
    });

    return this.prisma.bookingCheckout.findUniqueOrThrow({
      where: {
        id: checkout.id,
      },
      include: {
        hold: {
          select: {
            token: true,
            status: true,
            startsAt: true,
            endsAt: true,
            durationMinutes: true,
            totalAmountRial: true,
            expiresAt: true,
            package: {
              select: {
                id: true,
                code: true,
                nameFa: true,
              },
            },
          },
        },
      },
    });
  }

  private async findReusableCheckoutByHoldToken(holdToken: string) {
    const hold = await this.prisma.bookingHold.findUnique({
      where: {
        token: holdToken,
      },
      select: {
        status: true,
        expiresAt: true,
        checkout: true,
      },
    });

    if (!hold?.checkout) {
      return null;
    }

    if (
      hold.checkout.status === 'PENDING' &&
      hold.status === 'ACTIVE' &&
      hold.expiresAt > new Date()
    ) {
      return hold.checkout;
    }

    if (
      hold.checkout.status === 'PAID' ||
      hold.checkout.status === 'CONSUMED'
    ) {
      return hold.checkout;
    }

    return null;
  }

  private isRetryableCheckoutRace(error: unknown): boolean {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : '';
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (code === 'P2002' || code === 'P2034')
    );
  }

  async create(input: CreateBookingCheckoutInput) {
    const holdToken = input.holdToken?.trim();

    if (!holdToken) {
      throw new BadRequestException('holdToken is required.');
    }

    if (!input.vehicle) {
      throw new BadRequestException('vehicle is required.');
    }

    await this.bookingCapacityService.releaseExpiredHolds();

    /*
     * Creating a Checkout is an idempotent operation for a Hold.
     *
     * React StrictMode, browser retries, multiple tabs or network retries
     * may send more than one POST concurrently. The database unique
     * constraint remains the final authority, while retry/recovery below
     * makes every successful concurrent caller receive the same Checkout.
     */
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
                    vehicleType: true,
                  },
                },
                checkout: true,
              },
            });

            if (!hold) {
              throw new NotFoundException('Booking hold not found.');
            }

            if (hold.checkout) {
              if (
                hold.checkout.status === 'PENDING' &&
                hold.status === 'ACTIVE' &&
                hold.expiresAt > new Date()
              ) {
                return hold.checkout;
              }

              if (
                hold.checkout.status === 'PAID' ||
                hold.checkout.status === 'CONSUMED'
              ) {
                return hold.checkout;
              }

              throw new ConflictException(
                `Booking checkout is ${hold.checkout.status.toLowerCase()}.`,
              );
            }

            if (hold.status !== 'ACTIVE') {
              throw new ConflictException(
                `Booking hold is ${hold.status.toLowerCase()}.`,
              );
            }

            if (hold.expiresAt <= new Date()) {
              throw new ConflictException('Booking hold has expired.');
            }

            const vehicleSnapshot = await this.buildVehicleSnapshot(
              tx,
              hold.vehicleClassId,
              hold.vehicleClass.vehicleType,
              input.vehicle!,
            );

            return tx.bookingCheckout.create({
              data: {
                hold: {
                  connect: {
                    id: hold.id,
                  },
                },
                status: 'PENDING',
                amountRial: hold.totalAmountRial,
                vehicleSnapshot,
                expiresAt: hold.expiresAt,
              },
            });
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

        if (!this.isRetryableCheckoutRace(error)) {
          throw error;
        }

        /*
         * Another concurrent request may have won the race and created
         * the Checkout. Recover that Checkout instead of returning 409.
         */
        const reusableCheckout =
          await this.findReusableCheckoutByHoldToken(holdToken);

        if (reusableCheckout) {
          return reusableCheckout;
        }

        if (attempt < maxAttempts) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 20 * attempt);
          });

          continue;
        }

        /*
         * Last reconciliation after all bounded retries.
         */
        await this.bookingCapacityService.releaseExpiredHolds();

        const finalReusableCheckout =
          await this.findReusableCheckoutByHoldToken(holdToken);

        if (finalReusableCheckout) {
          return finalReusableCheckout;
        }

        const finalHold = await this.prisma.bookingHold.findUnique({
          where: {
            token: holdToken,
          },
          select: {
            status: true,
            expiresAt: true,
            checkout: {
              select: {
                status: true,
              },
            },
          },
        });

        if (!finalHold) {
          throw new NotFoundException('Booking hold not found.');
        }

        if (finalHold.status !== 'ACTIVE') {
          throw new ConflictException(
            `Booking hold is ${finalHold.status.toLowerCase()}.`,
          );
        }

        if (finalHold.expiresAt <= new Date()) {
          throw new ConflictException('Booking hold has expired.');
        }

        if (finalHold.checkout) {
          throw new ConflictException(
            `Booking checkout is ${finalHold.checkout.status.toLowerCase()}.`,
          );
        }

        throw new ConflictException(
          'Booking checkout could not be prepared safely. Please try again.',
        );
      }
    }

    throw new ConflictException(
      'Booking checkout could not be prepared safely. Please try again.',
    );
  }
  async findByToken(token: string) {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      throw new BadRequestException('Checkout token is required.');
    }

    await this.bookingCapacityService.releaseExpiredHolds();

    return this.synchronizeStatusByToken(normalizedToken);
  }

  async cancel(token: string) {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      throw new BadRequestException('Checkout token is required.');
    }

    await this.bookingCapacityService.releaseExpiredHolds();

    const checkout = await this.synchronizeStatusByToken(normalizedToken);

    if (checkout.status === 'CANCELLED' || checkout.status === 'EXPIRED') {
      return {
        token: checkout.token,
        status: checkout.status,
      };
    }

    if (checkout.status === 'PAID' || checkout.status === 'CONSUMED') {
      throw new BadRequestException(
        'Paid or consumed checkout cannot be cancelled.',
      );
    }

    if (checkout.hold.status === 'CONVERTED') {
      throw new BadRequestException(
        'Converted booking hold cannot be cancelled.',
      );
    }

    if (checkout.hold.status !== 'ACTIVE') {
      throw new ConflictException(
        `Booking hold is ${checkout.hold.status.toLowerCase()}.`,
      );
    }

    /*
     * releaseHoldById is the authority that claims ACTIVE -> CANCELLED.
     * It may lose a race against natural expiration, so never assume
     * CANCELLED until the final state has been read back.
     */
    await this.bookingCapacityService.releaseHoldById(
      checkout.holdId,
      'CANCELLED',
    );

    const finalCheckout = await this.synchronizeStatusByToken(normalizedToken);

    if (
      finalCheckout.status === 'CANCELLED' ||
      finalCheckout.status === 'EXPIRED'
    ) {
      return {
        token: finalCheckout.token,
        status: finalCheckout.status,
      };
    }

    if (
      finalCheckout.status === 'PAID' ||
      finalCheckout.status === 'CONSUMED'
    ) {
      throw new BadRequestException(
        'Paid or consumed checkout cannot be cancelled.',
      );
    }

    throw new ConflictException(
      'Booking checkout changed while being cancelled.',
    );
  }
}
