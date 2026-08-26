import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateTicketDto,
  CustomerVehicleDto,
  JourneyEventDto,
  PushSubscriptionDto,
  UpdateCustomerVehicleDto,
} from './customer.dto';

const activeBookingStatuses = [
  'UNDER_REVIEW',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_QUEUE',
  'IN_PROGRESS',
  'READY_FOR_PICKUP',
] as const;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private bookingInclude() {
    return {
      vehicleClass: { select: { nameFa: true, code: true } },
      customerVehicle: {
        include: { vehicleModel: { include: { brand: true } } },
      },
      addons: true,
      pickupCredential: { select: { consumedAt: true, lockedUntil: true } },
      pickupDelegates: {
        where: { isActive: true },
        select: { id: true, fullName: true, mobile: true },
      },
    } satisfies Prisma.BookingInclude;
  }

  bookings(customerId: string) {
    return this.prisma.booking.findMany({
      where: { customerId },
      orderBy: { startsAt: 'desc' },
      include: this.bookingInclude(),
    });
  }

  activeBooking(customerId: string) {
    return this.prisma.booking.findFirst({
      where: {
        customerId,
        status: { in: [...activeBookingStatuses] },
      },
      orderBy: { startsAt: 'asc' },
      include: this.bookingInclude(),
    });
  }

  async booking(customerId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, customerId },
      include: {
        ...this.bookingInclude(),
        package: { select: { nameFa: true, descriptionFa: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: {
          select: {
            id: true,
            provider: true,
            status: true,
            gatewayAmountRial: true,
            walletAmountRial: true,
            providerReferenceNumber: true,
            verifiedAt: true,
          },
        },
        loyaltyTransactions: {
          where: { points: { gt: 0 } },
          select: { points: true, description: true },
          orderBy: { createdAt: 'asc' },
        },
        invoice: true,
      },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'رزرو موردنظر پیدا نشد.',
      });
    }
    const deliveredPromotion =
      await this.prisma.couponPromotionDelivery.findFirst({
        where: { bookingId: booking.id, customerId },
        include: {
          coupon: {
            include: { _count: { select: { usages: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    const customerCouponUsageCount = deliveredPromotion
      ? await this.prisma.couponUsage.count({
          where: { couponId: deliveredPromotion.couponId, customerId },
        })
      : 0;
    const rewardCoupon =
      deliveredPromotion &&
      deliveredPromotion.coupon.isActive &&
      deliveredPromotion.coupon.displayPlacement === 'PAYMENT_SUCCESS' &&
      (!deliveredPromotion.coupon.startsAt ||
        deliveredPromotion.coupon.startsAt <= new Date()) &&
      customerCouponUsageCount < deliveredPromotion.coupon.perCustomerUsage &&
      (!deliveredPromotion.coupon.maxUsage ||
        deliveredPromotion.coupon._count.usages <
          deliveredPromotion.coupon.maxUsage) &&
      (!deliveredPromotion.coupon.endsAt ||
        deliveredPromotion.coupon.endsAt > new Date())
        ? {
            code: deliveredPromotion.coupon.code,
            type: deliveredPromotion.coupon.type,
            value: deliveredPromotion.coupon.value,
            endsAt: deliveredPromotion.coupon.endsAt,
          }
        : null;
    return {
      ...booking,
      completionReward: {
        points: booking.loyaltyTransactions.reduce(
          (total, transaction) => total + transaction.points,
          0,
        ),
        coupon: rewardCoupon,
      },
    };
  }

  invoices(customerId: string) {
    return this.prisma.invoice.findMany({
      where: { customerId },
      include: {
        booking: {
          select: {
            id: true,
            code: true,
            packageNameFa: true,
            startsAt: true,
            status: true,
          },
        },
        payment: {
          select: {
            provider: true,
            status: true,
            providerReferenceNumber: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async invoice(customerId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, customerId },
      include: { booking: true, payment: true },
    });
    if (!invoice) {
      throw new NotFoundException({
        code: 'INVOICE_NOT_FOUND',
        message: 'فاکتور موردنظر پیدا نشد.',
      });
    }
    return invoice;
  }

  vehicles(customerId: string) {
    return this.prisma.customerVehicle.findMany({
      where: { customerId, isActive: true },
      include: {
        vehicleClass: true,
        vehicleModel: { include: { brand: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private normalizePlate(value: string) {
    return value.replace(/[\s-]/g, '').trim().toUpperCase();
  }

  private async ensureVehicleIsUnique(
    customerId: string,
    input: {
      plateNormalized: string;
      vehicleModelId?: string | null;
      customBrandName?: string | null;
      customModelName?: string | null;
    },
    exceptId?: string,
  ) {
    const plate = this.normalizePlate(input.plateNormalized);
    const duplicatePlate = await this.prisma.customerVehicle.findFirst({
      where: {
        customerId,
        isActive: true,
        plateNormalized: plate,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (duplicatePlate) {
      throw new ConflictException({
        code: 'VEHICLE_PLATE_DUPLICATE',
        message: 'خودرویی با این پلاک در فهرست شما وجود دارد.',
      });
    }

    const modelFilters: Prisma.CustomerVehicleWhereInput[] = [];
    if (input.vehicleModelId) {
      modelFilters.push({ vehicleModelId: input.vehicleModelId });
    } else if (input.customBrandName && input.customModelName) {
      modelFilters.push({
        customBrandName: {
          equals: input.customBrandName.trim(),
          mode: 'insensitive',
        },
        customModelName: {
          equals: input.customModelName.trim(),
          mode: 'insensitive',
        },
      });
    }
    if (modelFilters.length) {
      const duplicateModel = await this.prisma.customerVehicle.findFirst({
        where: {
          customerId,
          isActive: true,
          OR: modelFilters,
          ...(exceptId ? { id: { not: exceptId } } : {}),
        },
        select: { id: true },
      });
      if (duplicateModel) {
        throw new ConflictException({
          code: 'VEHICLE_MODEL_DUPLICATE',
          message: 'این مدل خودرو از قبل در فهرست فعال شما ثبت شده است.',
        });
      }
    }
    return plate;
  }

  async createVehicle(customerId: string, dto: CustomerVehicleDto) {
    if (dto.source === 'CATALOG' && !dto.vehicleModelId) {
      throw new BadRequestException({
        code: 'VEHICLE_MODEL_REQUIRED',
        message: 'انتخاب مدل خودرو الزامی است.',
      });
    }
    if (
      dto.source === 'CUSTOM' &&
      (!dto.customBrandName || !dto.customModelName)
    ) {
      throw new BadRequestException({
        code: 'CUSTOM_VEHICLE_REQUIRED',
        message: 'نام برند و مدل خودرو را وارد کنید.',
      });
    }
    const vehicleClass = await this.prisma.vehicleClass.findUnique({
      where: { id: dto.vehicleClassId },
    });
    if (!vehicleClass) {
      throw new BadRequestException({
        code: 'VEHICLE_CLASS_NOT_FOUND',
        message: 'دسته‌بندی خودرو پیدا نشد.',
      });
    }
    const plateNormalized = await this.ensureVehicleIsUnique(customerId, dto);
    const carPlate = plateNormalized.match(/^(\d{2})(.)(\d{3})ایران(\d{2})$/);
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.customerVehicle.count({
        where: { customerId, isActive: true },
      });
      const shouldBeDefault = dto.isDefault === true || count === 0;
      if (shouldBeDefault) {
        await tx.customerVehicle.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const vehicle = await tx.customerVehicle.create({
        data: {
          customerId,
          source: dto.source,
          vehicleClassId: dto.vehicleClassId,
          vehicleType: vehicleClass.vehicleType,
          vehicleModelId: dto.vehicleModelId,
          customBrandName: dto.customBrandName?.trim(),
          customModelName: dto.customModelName?.trim(),
          color: dto.color.trim(),
          plateType: dto.plateType,
          plateNormalized,
          carPlateFirstTwo: carPlate?.[1],
          carPlateLetter: carPlate?.[2],
          carPlateMiddleThree: carPlate?.[3],
          carPlateIranCode: carPlate?.[4],
          motorcyclePlateTop:
            dto.plateType === 'IRAN_MOTORCYCLE'
              ? plateNormalized.slice(0, 3)
              : undefined,
          motorcyclePlateBottom:
            dto.plateType === 'IRAN_MOTORCYCLE'
              ? plateNormalized.slice(-5)
              : undefined,
          nickname: dto.nickname?.trim(),
          productionYear: dto.productionYear,
          isDefault: shouldBeDefault,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'CUSTOMER',
          actorId: customerId,
          action: 'VEHICLE_CREATED',
          entityType: 'CustomerVehicle',
          entityId: vehicle.id,
          after: { plateNormalized, vehicleModelId: dto.vehicleModelId },
        },
      });
      await tx.notification.create({
        data: {
          customerId,
          recipient: customerId,
          channel: 'IN_APP',
          templateCode: 'VEHICLE_CREATED',
          title: 'خودرو با موفقیت ثبت شد',
          body: 'خودروی جدید به فهرست خودروهای شما اضافه شد.',
          actionUrl: '/vehicles',
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      return vehicle;
    });
  }

  async updateVehicle(
    customerId: string,
    id: string,
    dto: UpdateCustomerVehicleDto,
  ) {
    const current = await this.prisma.customerVehicle.findFirst({
      where: { id, customerId, isActive: true },
    });
    if (!current) {
      throw new NotFoundException({
        code: 'VEHICLE_NOT_FOUND',
        message: 'خودرو پیدا نشد.',
      });
    }
    let vehicleType = current.vehicleType;
    if (dto.vehicleClassId) {
      const vehicleClass = await this.prisma.vehicleClass.findUnique({
        where: { id: dto.vehicleClassId },
      });
      if (!vehicleClass)
        throw new BadRequestException('دسته‌بندی خودرو پیدا نشد.');
      vehicleType = vehicleClass.vehicleType;
    }
    const plateNormalized = await this.ensureVehicleIsUnique(
      customerId,
      {
        plateNormalized: dto.plateNormalized ?? current.plateNormalized,
        vehicleModelId: dto.vehicleModelId ?? current.vehicleModelId,
        customBrandName: current.customBrandName,
        customModelName: current.customModelName,
      },
      id,
    );
    const carPlate = plateNormalized.match(/^(\d{2})(.)(\d{3})ایران(\d{2})$/);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerVehicle.updateMany({
          where: { customerId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      const updated = await tx.customerVehicle.update({
        where: { id },
        data: {
          ...dto,
          vehicleType,
          plateNormalized,
          carPlateFirstTwo: carPlate?.[1] ?? null,
          carPlateLetter: carPlate?.[2] ?? null,
          carPlateMiddleThree: carPlate?.[3] ?? null,
          carPlateIranCode: carPlate?.[4] ?? null,
          motorcyclePlateTop:
            current.plateType === 'IRAN_MOTORCYCLE'
              ? plateNormalized.slice(0, 3)
              : null,
          motorcyclePlateBottom:
            current.plateType === 'IRAN_MOTORCYCLE'
              ? plateNormalized.slice(-5)
              : null,
          color: dto.color?.trim(),
          nickname: dto.nickname?.trim(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'CUSTOMER',
          actorId: customerId,
          action: 'VEHICLE_UPDATED',
          entityType: 'CustomerVehicle',
          entityId: id,
          before: current,
          after: updated,
        },
      });
      return updated;
    });
  }

  async setDefaultVehicle(customerId: string, id: string) {
    const vehicle = await this.prisma.customerVehicle.findFirst({
      where: { id, customerId, isActive: true },
    });
    if (!vehicle) throw new NotFoundException('خودرو پیدا نشد.');
    await this.prisma.$transaction([
      this.prisma.customerVehicle.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.customerVehicle.update({
        where: { id },
        data: { isDefault: true },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: 'CUSTOMER',
          actorId: customerId,
          action: 'VEHICLE_SET_DEFAULT',
          entityType: 'CustomerVehicle',
          entityId: id,
        },
      }),
    ]);
    return { success: true };
  }

  async archiveVehicle(customerId: string, id: string) {
    const vehicle = await this.prisma.customerVehicle.findFirst({
      where: { id, customerId, isActive: true },
    });
    if (!vehicle) throw new NotFoundException('خودرو پیدا نشد.');
    await this.prisma.$transaction(async (tx) => {
      await tx.customerVehicle.update({
        where: { id },
        data: { isActive: false, isDefault: false, archivedAt: new Date() },
      });
      if (vehicle.isDefault) {
        const replacement = await tx.customerVehicle.findFirst({
          where: { customerId, isActive: true, id: { not: id } },
          orderBy: { createdAt: 'desc' },
        });
        if (replacement) {
          await tx.customerVehicle.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          actorType: 'CUSTOMER',
          actorId: customerId,
          action: 'VEHICLE_ARCHIVED',
          entityType: 'CustomerVehicle',
          entityId: id,
          before: vehicle,
        },
      });
    });
    return { success: true };
  }

  async cancelBooking(customerId: string, id: string, reason?: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, customerId },
      include: {
        allocations: true,
        payments: true,
        customer: { select: { mobile: true } },
      },
    });
    if (!booking) throw new NotFoundException('رزرو پیدا نشد.');
    if (booking.status !== 'CONFIRMED') {
      throw new ConflictException({
        code: 'BOOKING_CANNOT_BE_CANCELLED',
        message: 'این رزرو در وضعیت فعلی قابل لغو نیست.',
      });
    }
    const setting = await this.prisma.businessSetting.findUnique({
      where: { key: 'cancellationDeadlineHours' },
    });
    const deadlineHours =
      typeof setting?.value === 'number' ? setting.value : 2;
    const cancellationDeadline = new Date(
      booking.startsAt.getTime() - deadlineHours * 3_600_000,
    );
    if (new Date() >= cancellationDeadline) {
      throw new ConflictException({
        code: 'CANCELLATION_DEADLINE_PASSED',
        message: `مهلت لغو آنلاین این رزرو (${deadlineHours} ساعت پیش از شروع) گذشته است.`,
      });
    }

    const refundAmountRial =
      booking.paymentStatus === 'PAID'
        ? booking.walletAmountRial + booking.gatewayAmountRial
        : 0;
    const now = new Date();
    const refundDueAt = new Date(now.getTime() + 24 * 3_600_000);
    return this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.booking.updateMany({
          where: { id, customerId, status: 'CONFIRMED' },
          data: {
            status: 'CANCELLED',
            cancelledAt: now,
            cancellationReason: reason?.trim() || 'لغو توسط مشتری',
            refundDueAt: refundAmountRial > 0 ? refundDueAt : null,
            paymentStatus:
              refundAmountRial > 0 ? 'REFUNDED' : booking.paymentStatus,
          },
        });
        if (claimed.count !== 1)
          throw new ConflictException('وضعیت رزرو تغییر کرده است.');
        for (const allocation of booking.allocations) {
          await tx.bookingCapacityBucket.updateMany({
            where: { startsAt: allocation.startsAt, usedCapacity: { gt: 0 } },
            data: { usedCapacity: { decrement: 1 } },
          });
        }

        if (refundAmountRial > 0) {
          const wallet = await tx.walletAccount.upsert({
            where: { customerId },
            update: {},
            create: { customerId },
          });
          const previousRefund = await tx.walletTransaction.findUnique({
            where: { idempotencyKey: `booking:refund:${id}` },
          });
          if (!previousRefund) {
            const updatedWallet = await tx.walletAccount.update({
              where: { id: wallet.id },
              data: { balanceRial: { increment: refundAmountRial } },
            });
            const transaction = await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                bookingId: id,
                type: 'REFUND',
                amountRial: refundAmountRial,
                balanceAfterRial: updatedWallet.balanceRial,
                idempotencyKey: `booking:refund:${id}`,
                reason: 'بازپرداخت رزرو لغوشده به اعتبار غیرقابل برداشت',
              },
            });
            await tx.walletCreditLot.create({
              data: {
                walletId: wallet.id,
                originalAmountRial: refundAmountRial,
                remainingAmountRial: refundAmountRial,
                sourceTransactionId: transaction.id,
              },
            });
          }
          for (const payment of booking.payments) {
            if (payment.status === 'PAID') {
              await tx.payment.update({
                where: { id: payment.id },
                data: { status: 'REFUNDED' },
              });
              await tx.refund.create({
                data: {
                  paymentId: payment.id,
                  amountRial: payment.amountRial,
                  status: 'WALLET_CREDITED',
                  reason: reason?.trim() || 'لغو توسط مشتری',
                  processedAt: now,
                },
              });
            }
          }
        }

        const cashback = await tx.walletTransaction.findUnique({
          where: { idempotencyKey: `cashback:${id}` },
        });
        const cashbackReversal = await tx.walletTransaction.findUnique({
          where: { idempotencyKey: `cashback:reversal:${id}` },
        });
        if (cashback && cashback.amountRial > 0 && !cashbackReversal) {
          const wallet = await tx.walletAccount.findUnique({
            where: { id: cashback.walletId },
          });
          if (wallet) {
            const reversalAmount = Math.min(
              cashback.amountRial,
              wallet.balanceRial,
            );
            const updatedWallet = await tx.walletAccount.update({
              where: { id: wallet.id },
              data: { balanceRial: { decrement: reversalAmount } },
            });
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                bookingId: id,
                type: 'REVERSAL',
                amountRial: -reversalAmount,
                balanceAfterRial: updatedWallet.balanceRial,
                idempotencyKey: `cashback:reversal:${id}`,
                reason: 'لغو اعتبار بازگشتی پس از لغو رزرو',
              },
            });
            await tx.walletCreditLot.updateMany({
              where: { sourceTransactionId: cashback.id },
              data: { remainingAmountRial: 0, expiredAt: now },
            });
          }
        }

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: id,
            fromStatus: booking.status,
            toStatus: 'CANCELLED',
            actorType: 'CUSTOMER',
            actorId: customerId,
            reason: reason?.trim() || 'لغو توسط مشتری',
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: 'CUSTOMER',
            actorId: customerId,
            action: 'BOOKING_CANCELLED',
            entityType: 'Booking',
            entityId: id,
            before: { status: booking.status },
            after: { status: 'CANCELLED', refundAmountRial },
          },
        });
        await tx.notification.create({
          data: {
            customerId,
            recipient: customerId,
            channel: 'IN_APP',
            templateCode: 'BOOKING_CANCELLED',
            title: 'رزرو لغو شد',
            body:
              refundAmountRial > 0
                ? 'رزرو لغو و مبلغ پرداختی به کیف پول شما بازگردانده شد.'
                : 'رزرو شما با موفقیت لغو شد.',
            actionUrl: `/bookings/${id}`,
            status: 'SENT',
            sentAt: now,
          },
        });
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'booking',
            aggregateId: id,
            eventType: 'booking.cancelled',
            idempotencyKey: `booking.cancelled:${id}`,
            payload: {
              bookingId: id,
              bookingCode: booking.code,
              customerId,
              mobile: booking.customer?.mobile,
              refundAmountRial,
              templateCode: 'BOOKING_CANCELLED',
            },
          },
        });
        return {
          success: true,
          refundAmountRial,
          refundMethod: refundAmountRial > 0 ? 'WALLET_CREDIT' : null,
          refundDueAt: refundAmountRial > 0 ? refundDueAt : null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async wallet(customerId: string) {
    return this.prisma.walletAccount.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { booking: { select: { code: true } } },
        },
        creditLots: {
          where: { remainingAmountRial: { gt: 0 } },
          orderBy: { expiresAt: 'asc' },
        },
      },
    });
  }

  async loyalty(customerId: string) {
    const [account, tiers, rules, rewards] = await Promise.all([
      this.prisma.loyaltyAccount.upsert({
        where: { customerId },
        update: {},
        create: { customerId },
        include: {
          tier: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { booking: { select: { code: true } } },
          },
        },
      }),
      this.prisma.loyaltyTier.findMany({
        where: { isActive: true },
        orderBy: { minPoints: 'asc' },
      }),
      this.prisma.loyaltyRule.findMany({ where: { isActive: true } }),
      this.prisma.loyaltyReward.findMany({
        where: { isActive: true },
        orderBy: { pointsCost: 'asc' },
      }),
    ]);
    return { account, tiers, rules, rewards };
  }

  async notifications(customerId: string) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { customerId, channel: 'IN_APP' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.notification.count({
        where: { customerId, channel: 'IN_APP', readAt: null },
      }),
    ]);
    return { items, unreadCount };
  }

  async readAllNotifications(customerId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { customerId, channel: 'IN_APP', readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, count: result.count };
  }

  async readNotification(customerId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, customerId, channel: 'IN_APP' },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('اعلان پیدا نشد.');
    return { success: true };
  }

  subscribePush(
    customerId: string,
    dto: PushSubscriptionDto,
    userAgent?: string,
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        customerId,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent,
        isActive: true,
      },
      create: { customerId, ...dto, userAgent },
    });
  }

  async unsubscribePush(customerId: string, endpoint: string) {
    await this.prisma.pushSubscription.updateMany({
      where: { customerId, endpoint },
      data: { isActive: false },
    });
    return { success: true };
  }

  tickets(customerId: string) {
    return this.prisma.supportTicket.findMany({
      where: { customerId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async ticket(customerId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, customerId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw new NotFoundException('درخواست پشتیبانی پیدا نشد.');
    await this.prisma.supportMessage.updateMany({
      where: { ticketId: id, authorType: 'ADMIN', readAt: null },
      data: { readAt: new Date() },
    });
    return ticket;
  }

  async createTicket(customerId: string, dto: CreateTicketDto) {
    const code = `BW-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;
    const ticket = await this.prisma.supportTicket.create({
      data: {
        code,
        customerId,
        subject: dto.subject.trim(),
        category: dto.category,
        messages: {
          create: {
            authorType: 'CUSTOMER',
            authorId: customerId,
            body: dto.message.trim(),
          },
        },
      },
      include: { messages: true },
    });
    await this.prisma.auditLog.create({
      data: {
        actorType: 'CUSTOMER',
        actorId: customerId,
        action: 'SUPPORT_TICKET_CREATED',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        after: { code, category: dto.category },
      },
    });
    await this.prisma.adminNotification.create({
      data: {
        type: 'SUPPORT_TICKET_CREATED',
        title: 'تیکت پشتیبانی جدید',
        body: `درخواست ${code} با موضوع «${dto.subject.trim()}» ثبت شد.`,
        actionUrl: '/admin/support',
        entityType: 'SupportTicket',
        entityId: ticket.id,
      },
    });
    return ticket;
  }

  async replyTicket(customerId: string, id: string, message: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, customerId },
    });
    if (!ticket) throw new NotFoundException('درخواست پشتیبانی پیدا نشد.');
    if (ticket.status === 'CLOSED')
      throw new ConflictException('این درخواست بسته شده است.');
    const reply = await this.prisma.supportMessage.create({
      data: {
        ticketId: id,
        authorType: 'CUSTOMER',
        authorId: customerId,
        body: message.trim(),
      },
    });
    await this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'OPEN' },
    });
    await this.prisma.adminNotification.create({
      data: {
        type: 'SUPPORT_TICKET_REPLIED',
        title: 'پاسخ جدید مشتری',
        body: `مشتری به درخواست ${ticket.code} پاسخ داد.`,
        actionUrl: '/admin/support',
        entityType: 'SupportTicket',
        entityId: ticket.id,
      },
    });
    return reply;
  }

  async journey(customerId: string, dto: JourneyEventDto) {
    const journey = await this.prisma.customerJourney.upsert({
      where: { sessionId: dto.sessionId },
      update: { customerId, currentStep: dto.step, lastActivityAt: new Date() },
      create: { sessionId: dto.sessionId, customerId, currentStep: dto.step },
    });
    await this.prisma.customerJourneyEvent.create({
      data: { journeyId: journey.id, eventName: dto.eventName, step: dto.step },
    });
    return journey;
  }
}
