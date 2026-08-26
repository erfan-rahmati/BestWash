import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BookingsService,
  type BookingVehicleInput,
} from '../bookings/bookings.service';
import { normalizeIranianMobile } from '../auth/mobile';
import type { PaymentProviderAdapter } from './providers/payment-provider.interface';
import { TestPaymentProvider } from './providers/test-payment.provider';
import { ZibalPaymentProvider } from './providers/zibal-payment.provider';
import { ZarinpalPaymentProvider } from './providers/zarinpal-payment.provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly bookings: BookingsService,
    private readonly zibal: ZibalPaymentProvider,
    private readonly zarinpal: ZarinpalPaymentProvider,
    private readonly testProvider: TestPaymentProvider,
  ) {}

  private provider(): PaymentProviderAdapter {
    const provider = this.config.get<string>('PAYMENT_PROVIDER');
    if (provider === 'zarinpal') return this.zarinpal;
    if (provider === 'zibal') return this.zibal;
    return this.testProvider;
  }

  private response(payment: {
    id: string;
    status: string;
    provider: string;
    amountRial: number;
    walletAmountRial: number;
    gatewayAmountRial: number;
    providerTrackId: string | null;
    bookingId: string | null;
  }) {
    return {
      id: payment.id,
      status: payment.status,
      provider: payment.provider,
      amountRial: payment.amountRial,
      walletAmountRial: payment.walletAmountRial,
      gatewayAmountRial: payment.gatewayAmountRial,
      providerTrackId: payment.providerTrackId,
      bookingId: payment.bookingId,
    };
  }

  async quote(
    customerId: string,
    checkoutToken: string,
    useWallet: boolean,
    couponCode?: string,
  ) {
    const checkout = await this.prisma.bookingCheckout.findUnique({
      where: { token: checkoutToken },
      include: { hold: true },
    });
    if (
      !checkout ||
      checkout.status !== 'PENDING' ||
      checkout.expiresAt <= new Date() ||
      checkout.hold.status !== 'ACTIVE'
    ) {
      throw new ConflictException({
        code: 'CHECKOUT_EXPIRED',
        message: 'مهلت این تسویه‌حساب به پایان رسیده است.',
      });
    }
    if (checkout.customerId && checkout.customerId !== customerId) {
      throw new ForbiddenException({
        code: 'CHECKOUT_OWNER_MISMATCH',
        message: 'این تسویه‌حساب متعلق به حساب دیگری است.',
      });
    }
    const normalizedCouponCode = couponCode?.trim().toUpperCase() || null;
    let discountAmountRial = 0;
    if (normalizedCouponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: normalizedCouponCode },
        include: { serviceScopes: true, usages: true },
      });
      const now = new Date();
      if (
        !coupon ||
        !coupon.isActive ||
        (coupon.startsAt && coupon.startsAt > now) ||
        (coupon.endsAt && coupon.endsAt < now)
      ) {
        throw new BadRequestException({
          code: 'COUPON_INVALID',
          message: 'کد تخفیف معتبر نیست یا منقضی شده است.',
        });
      }
      if (checkout.amountRial < coupon.minimumAmountRial)
        throw new BadRequestException({
          code: 'COUPON_MINIMUM_NOT_MET',
          message: 'مبلغ این رزرو به حداقل لازم برای کد تخفیف نمی‌رسد.',
        });
      if (coupon.maxUsage && coupon.usages.length >= coupon.maxUsage)
        throw new BadRequestException({
          code: 'COUPON_USAGE_LIMIT',
          message: 'ظرفیت استفاده از این کد تخفیف تکمیل شده است.',
        });
      if (
        coupon.usages.filter((usage) => usage.customerId === customerId)
          .length >= coupon.perCustomerUsage
      )
        throw new BadRequestException({
          code: 'COUPON_ALREADY_USED',
          message: 'شما قبلاً از این کد تخفیف استفاده کرده‌اید.',
        });
      const priorBookings = await this.prisma.booking.count({
        where: { customerId, paymentStatus: 'PAID' },
      });
      if (coupon.firstBookingOnly && priorBookings > 0)
        throw new BadRequestException({
          code: 'COUPON_FIRST_BOOKING_ONLY',
          message: 'این کد فقط برای نخستین رزرو قابل استفاده است.',
        });
      if (priorBookings < coupon.minimumPriorBookings)
        throw new BadRequestException({
          code: 'COUPON_PRIOR_BOOKING_REQUIRED',
          message:
            'این هدیه پس از ثبت نخستین رزرو و برای رزرو بعدی فعال می‌شود.',
        });
      if (coupon.minimumPoints > 0 || coupon.eligibleTierCodes.length > 0) {
        const loyalty = await this.prisma.loyaltyAccount.findUnique({
          where: { customerId },
          include: { tier: true },
        });
        if ((loyalty?.points ?? 0) < coupon.minimumPoints) {
          throw new BadRequestException({
            code: 'COUPON_POINTS_REQUIRED',
            message: 'امتیاز باشگاه شما برای استفاده از این کد کافی نیست.',
          });
        }
        if (
          coupon.eligibleTierCodes.length > 0 &&
          (!loyalty?.tier ||
            !coupon.eligibleTierCodes.includes(loyalty.tier.code))
        ) {
          throw new BadRequestException({
            code: 'COUPON_TIER_MISMATCH',
            message: 'این کد برای سطح فعلی باشگاه شما فعال نیست.',
          });
        }
      }
      if (
        coupon.serviceScopes.length &&
        !coupon.serviceScopes.some(
          (scope) => scope.packageId === checkout.hold.packageId,
        )
      )
        throw new BadRequestException({
          code: 'COUPON_SERVICE_MISMATCH',
          message: 'این کد برای سرویس انتخابی شما قابل استفاده نیست.',
        });
      discountAmountRial =
        coupon.type === 'PERCENTAGE'
          ? Math.floor((checkout.amountRial * coupon.value) / 100)
          : coupon.value;
      discountAmountRial = Math.min(
        checkout.amountRial,
        Math.max(0, discountAmountRial),
      );
    }
    const payableAmountRial = checkout.amountRial - discountAmountRial;
    const wallet = await this.prisma.walletAccount.findUnique({
      where: { customerId },
    });
    const walletAmountRial = useWallet
      ? Math.min(wallet?.balanceRial ?? 0, payableAmountRial)
      : 0;
    return {
      subtotalRial: checkout.amountRial,
      couponCode: normalizedCouponCode,
      discountAmountRial,
      walletAmountRial,
      gatewayAmountRial: payableAmountRial - walletAmountRial,
      totalAmountRial: payableAmountRial,
    };
  }

  async initiate(
    customerId: string,
    checkoutToken: string,
    useWallet: boolean,
    idempotencyKey: string,
    couponCode?: string,
    pickup?: { mode?: 'OWNER' | 'DELEGATE'; name?: string; mobile?: string },
  ) {
    if (
      !idempotencyKey ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 200
    ) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'شناسه یکتای درخواست پرداخت الزامی است.',
      });
    }
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return this.response(existing);

    const payment = await this.prisma.$transaction(
      async (tx) => {
        const checkout = await tx.bookingCheckout.findUnique({
          where: { token: checkoutToken },
          include: { hold: true },
        });
        if (!checkout) {
          throw new NotFoundException({
            code: 'CHECKOUT_NOT_FOUND',
            message: 'تسویه‌حساب پیدا نشد.',
          });
        }
        if (
          checkout.status !== 'PENDING' ||
          checkout.expiresAt <= new Date() ||
          checkout.hold.status !== 'ACTIVE'
        ) {
          throw new ConflictException({
            code: 'CHECKOUT_EXPIRED',
            message: 'مهلت این تسویه‌حساب به پایان رسیده است.',
          });
        }
        if (checkout.customerId && checkout.customerId !== customerId) {
          throw new ForbiddenException({
            code: 'CHECKOUT_OWNER_MISMATCH',
            message: 'این تسویه‌حساب متعلق به حساب دیگری است.',
          });
        }

        const normalizedCouponCode = couponCode?.trim().toUpperCase() || null;
        let discountAmountRial = 0;
        if (normalizedCouponCode) {
          const coupon = await tx.coupon.findUnique({
            where: { code: normalizedCouponCode },
            include: { serviceScopes: true, usages: true },
          });
          const now = new Date();
          if (
            !coupon ||
            !coupon.isActive ||
            (coupon.startsAt && coupon.startsAt > now) ||
            (coupon.endsAt && coupon.endsAt < now)
          ) {
            throw new BadRequestException({
              code: 'COUPON_INVALID',
              message: 'کد تخفیف معتبر نیست یا منقضی شده است.',
            });
          }
          if (checkout.amountRial < coupon.minimumAmountRial) {
            throw new BadRequestException({
              code: 'COUPON_MINIMUM_NOT_MET',
              message: 'مبلغ این رزرو به حداقل لازم برای کد تخفیف نمی‌رسد.',
            });
          }
          if (coupon.maxUsage && coupon.usages.length >= coupon.maxUsage) {
            throw new BadRequestException({
              code: 'COUPON_USAGE_LIMIT',
              message: 'ظرفیت استفاده از این کد تخفیف تکمیل شده است.',
            });
          }
          const customerUsage = coupon.usages.filter(
            (usage) => usage.customerId === customerId,
          ).length;
          if (customerUsage >= coupon.perCustomerUsage) {
            throw new BadRequestException({
              code: 'COUPON_ALREADY_USED',
              message: 'شما قبلاً از این کد تخفیف استفاده کرده‌اید.',
            });
          }
          if (coupon.firstBookingOnly) {
            const previousBookings = await tx.booking.count({
              where: { customerId, paymentStatus: 'PAID' },
            });
            if (previousBookings > 0) {
              throw new BadRequestException({
                code: 'COUPON_FIRST_BOOKING_ONLY',
                message: 'این کد فقط برای نخستین رزرو قابل استفاده است.',
              });
            }
          }
          if (coupon.minimumPriorBookings > 0) {
            const priorBookings = await tx.booking.count({
              where: { customerId, paymentStatus: 'PAID' },
            });
            if (priorBookings < coupon.minimumPriorBookings) {
              throw new BadRequestException({
                code: 'COUPON_PRIOR_BOOKING_REQUIRED',
                message:
                  'این هدیه پس از ثبت نخستین رزرو و برای رزرو بعدی فعال می‌شود.',
              });
            }
          }
          if (coupon.minimumPoints > 0 || coupon.eligibleTierCodes.length > 0) {
            const loyalty = await tx.loyaltyAccount.findUnique({
              where: { customerId },
              include: { tier: true },
            });
            if ((loyalty?.points ?? 0) < coupon.minimumPoints) {
              throw new BadRequestException({
                code: 'COUPON_POINTS_REQUIRED',
                message: 'امتیاز باشگاه شما برای استفاده از این کد کافی نیست.',
              });
            }
            if (
              coupon.eligibleTierCodes.length > 0 &&
              (!loyalty?.tier ||
                !coupon.eligibleTierCodes.includes(loyalty.tier.code))
            ) {
              throw new BadRequestException({
                code: 'COUPON_TIER_MISMATCH',
                message: 'این کد برای سطح فعلی باشگاه شما فعال نیست.',
              });
            }
          }
          if (
            coupon.serviceScopes.length > 0 &&
            !coupon.serviceScopes.some(
              (scope) => scope.packageId === checkout.hold.packageId,
            )
          ) {
            throw new BadRequestException({
              code: 'COUPON_SERVICE_MISMATCH',
              message: 'این کد برای سرویس انتخابی شما قابل استفاده نیست.',
            });
          }
          discountAmountRial =
            coupon.type === 'PERCENTAGE'
              ? Math.floor((checkout.amountRial * coupon.value) / 100)
              : coupon.value;
          discountAmountRial = Math.min(
            checkout.amountRial,
            Math.max(0, discountAmountRial),
          );
        }
        const payableAmountRial = checkout.amountRial - discountAmountRial;

        const wallet = await tx.walletAccount.upsert({
          where: { customerId },
          update: {},
          create: { customerId },
        });
        const walletAmountRial = useWallet
          ? Math.min(wallet.balanceRial, payableAmountRial)
          : 0;
        const gatewayAmountRial = payableAmountRial - walletAmountRial;

        if (walletAmountRial > 0) {
          const updated = await tx.walletAccount.updateMany({
            where: { id: wallet.id, balanceRial: { gte: walletAmountRial } },
            data: { balanceRial: { decrement: walletAmountRial } },
          });
          if (updated.count !== 1) {
            throw new ConflictException({
              code: 'WALLET_BALANCE_CHANGED',
              message: 'موجودی کیف پول تغییر کرده است.',
            });
          }
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'PAYMENT',
              amountRial: -walletAmountRial,
              balanceAfterRial: wallet.balanceRial - walletAmountRial,
              idempotencyKey: `wallet:${idempotencyKey}`,
              reason: 'رزرو اعتبار برای پرداخت BestWash',
            },
          });
        }

        const pickupMode = pickup?.mode ?? checkout.pickupMode;
        const savedDelegate = checkout.delegateSnapshot as {
          fullName?: string;
          mobile?: string;
        } | null;
        const delegateName = pickup?.name ?? savedDelegate?.fullName;
        const delegateMobile = pickup?.mobile ?? savedDelegate?.mobile;
        if (pickupMode === 'DELEGATE' && (!delegateName || !delegateMobile)) {
          throw new BadRequestException({
            code: 'DELEGATE_REQUIRED',
            message: 'نام و شماره تحویل‌گیرنده الزامی است.',
          });
        }
        await tx.bookingCheckout.update({
          where: { id: checkout.id },
          data: {
            customerId,
            couponCode: normalizedCouponCode,
            discountAmountRial,
            walletAmountRial,
            gatewayAmountRial,
            pickupMode,
            delegateSnapshot:
              pickupMode === 'DELEGATE'
                ? {
                    fullName: delegateName!,
                    mobile: normalizeIranianMobile(delegateMobile!),
                  }
                : Prisma.JsonNull,
          },
        });
        const provider = this.provider();
        return tx.payment.create({
          data: {
            checkoutId: checkout.id,
            customerId,
            provider: gatewayAmountRial === 0 ? 'TEST' : provider.name,
            status: 'CREATED',
            amountRial: payableAmountRial,
            walletAmountRial,
            gatewayAmountRial,
            idempotencyKey,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (payment.gatewayAmountRial === 0) {
      return this.verifyAndConfirm(payment.id, `wallet_${payment.id}`, true);
    }

    const callbackUrl =
      this.config.get<string>('PAYMENT_CALLBACK_URL') ??
      'http://localhost:3001/api/v1/payments/zarinpal/callback';
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      const requested = await this.provider().request({
        paymentId: payment.id,
        amountRial: payment.gatewayAmountRial,
        callbackUrl,
        mobile: customer?.mobile,
        description: `رزرو آنلاین BestWash - ${payment.id}`,
      });
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REDIRECTED',
          providerTrackId: requested.trackId,
          redirectedAt: new Date(),
        },
      });
      await this.prisma.paymentAttempt.create({
        data: {
          paymentId: payment.id,
          operation: 'REQUEST',
          responseSnapshot: requested.raw as Prisma.InputJsonValue,
          success: true,
        },
      });
      return { ...this.response(updated), redirectUrl: requested.redirectUrl };
    } catch (error) {
      await this.markFailedAndReleaseWallet(
        payment.id,
        error instanceof Error ? error.message : 'request failed',
      );
      throw error;
    }
  }

  async callback(trackId: string, payload: Record<string, unknown>) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerTrackId: trackId },
    });
    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'پرداخت پیدا نشد.',
      });
    }
    await this.prisma.paymentCallback.create({
      data: {
        paymentId: payment.id,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    return this.verifyAndConfirm(payment.id, trackId, false);
  }

  async completeTest(paymentId: string) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('Test payment is disabled in production.');
    }
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || payment.provider !== 'TEST') {
      throw new NotFoundException('Test payment not found.');
    }
    return this.verifyAndConfirm(
      payment.id,
      payment.providerTrackId ?? `test_${payment.id}`,
      false,
    );
  }

  private async verifyAndConfirm(
    paymentId: string,
    trackId: string,
    walletOnly: boolean,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        checkout: { include: { hold: true } },
        customer: {
          select: { mobile: true, firstName: true, lastName: true },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status === 'PAID' && payment.bookingId)
      return this.response(payment);

    const verified = walletOnly
      ? {
          success: true,
          amountRial: 0,
          referenceNumber: `WALLET-${payment.id}`,
          raw: { walletOnly: true },
        }
      : await (
          payment.provider === 'ZARINPAL'
            ? this.zarinpal
            : payment.provider === 'ZIBAL'
              ? this.zibal
              : this.testProvider
        ).verify(trackId, payment.gatewayAmountRial);
    if (
      !verified.success ||
      verified.amountRial !== payment.gatewayAmountRial
    ) {
      await this.markFailedAndReleaseWallet(
        payment.id,
        'verification or amount mismatch',
      );
      throw new ConflictException({
        code: 'PAYMENT_VERIFY_FAILED',
        message: 'تأیید پرداخت ناموفق بود.',
      });
    }

    const claimed = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ['CREATED', 'PENDING', 'REDIRECTED'] },
      },
      data: {
        status: 'PAID',
        providerReferenceNumber: verified.referenceNumber,
        callbackReceivedAt: new Date(),
        verifiedAt: new Date(),
      },
    });
    if (claimed.count === 0) {
      const latest = await this.prisma.payment.findUnique({
        where: { id: payment.id },
      });
      if (latest?.status === 'PAID' && latest.bookingId)
        return this.response(latest);
      throw new ConflictException('Payment is not confirmable.');
    }

    const vehicle = payment.checkout
      .vehicleSnapshot as unknown as BookingVehicleInput;
    const booking = await this.bookings.create({
      holdToken: payment.checkout.hold.token,
      vehicle,
    });
    const delegate = payment.checkout.delegateSnapshot as {
      fullName?: string;
      mobile?: string;
    } | null;
    const finalBookingStatus =
      payment.checkout.source === 'ADMIN_MANUAL'
        ? ('CONFIRMED' as const)
        : ('UNDER_REVIEW' as const);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          checkoutId: payment.checkoutId,
          customerId: payment.customerId,
          source: payment.checkout.source,
          createdByAdminId: payment.checkout.createdByAdminId,
          status: finalBookingStatus,
          paymentStatus: 'PAID',
          pickupMode: payment.checkout.pickupMode,
          discountAmountRial: payment.checkout.discountAmountRial,
          walletAmountRial: payment.walletAmountRial,
          gatewayAmountRial: payment.gatewayAmountRial,
          ...(delegate?.fullName && delegate.mobile
            ? {
                pickupDelegates: {
                  create: {
                    fullName: delegate.fullName,
                    mobile: delegate.mobile,
                  },
                },
              }
            : {}),
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: finalBookingStatus,
              actorType: 'SYSTEM',
              reason:
                payment.checkout.source === 'ADMIN_MANUAL'
                  ? 'ADMIN_MANUAL_PAYMENT_CONFIRMED'
                  : 'SETTLEMENT_COMPLETE_AWAITING_ADMIN_REVIEW',
            },
          },
        },
      });
      await tx.bookingCheckout.update({
        where: { id: payment.checkoutId },
        data: {
          status: 'CONSUMED',
          paidAt: new Date(),
          consumedAt: new Date(),
        },
      });
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: { bookingId: booking.id },
      });
      await tx.adminNotification.create({
        data: {
          type: 'PAYMENT_RECEIVED',
          title: 'پرداخت موفق جدید',
          body: `پرداخت رزرو ${booking.code} به مبلغ ${payment.amountRial.toLocaleString('fa-IR')} ریال تأیید شد.`,
          actionUrl: '/admin/payments',
          entityType: 'Payment',
          entityId: payment.id,
        },
      });
      await tx.adminNotification.create({
        data: {
          type:
            payment.checkout.source === 'ADMIN_MANUAL'
              ? 'MANUAL_BOOKING_CONFIRMED'
              : 'BOOKING_REVIEW_REQUIRED',
          title:
            payment.checkout.source === 'ADMIN_MANUAL'
              ? 'رزرو دستی تأیید شد'
              : 'رزرو جدید نیازمند بررسی',
          body:
            payment.checkout.source === 'ADMIN_MANUAL'
              ? `رزرو دستی ${booking.code} پس از پرداخت، خودکار تأیید شد.`
              : `رزرو ${booking.code} پرداخت شده و منتظر تأیید یا رد مدیر است.`,
          actionUrl: '/admin/bookings',
          entityType: 'Booking',
          entityId: booking.id,
        },
      });
      await tx.invoice.upsert({
        where: { paymentId: payment.id },
        update: {},
        create: {
          number: `INV-${booking.code}`,
          bookingId: booking.id,
          paymentId: payment.id,
          customerId: payment.customerId!,
          subtotalRial: payment.checkout.amountRial,
          discountRial: payment.checkout.discountAmountRial,
          walletRial: payment.walletAmountRial,
          gatewayRial: payment.gatewayAmountRial,
          totalRial: payment.amountRial,
          snapshot: {
            bookingCode: booking.code,
            packageNameFa: booking.packageNameFa,
            vehicle: `${booking.brandName ?? ''} ${booking.modelName}`.trim(),
            plateNormalized: booking.plateNormalized,
            startsAt: booking.startsAt.toISOString(),
          },
        },
      });
      if (payment.customerId) {
        await tx.customer.update({
          where: { id: payment.customerId },
          data: { lastBookingAt: new Date() },
        });
        if (payment.checkout.couponCode) {
          const coupon = await tx.coupon.findUnique({
            where: { code: payment.checkout.couponCode },
          });
          if (coupon) {
            await tx.couponUsage.create({
              data: {
                couponId: coupon.id,
                customerId: payment.customerId,
                bookingId: booking.id,
                discountAmountRial: payment.checkout.discountAmountRial,
              },
            });
          }
        }

        const rule = await tx.loyaltyRule.findFirst({
          where: { eventName: 'booking.confirmed', isActive: true },
        });
        const points = rule?.points ?? 30;
        const loyalty = await tx.loyaltyAccount.upsert({
          where: { customerId: payment.customerId },
          update: {},
          create: { customerId: payment.customerId },
        });
        const alreadyRewarded = await tx.loyaltyTransaction.findUnique({
          where: { idempotencyKey: `loyalty:confirmed:${booking.id}` },
        });
        if (!alreadyRewarded && points > 0) {
          const updatedLoyalty = await tx.loyaltyAccount.update({
            where: { id: loyalty.id },
            data: { points: { increment: points } },
          });
          await tx.loyaltyTransaction.create({
            data: {
              accountId: loyalty.id,
              bookingId: booking.id,
              points,
              type: 'BOOKING_CONFIRMED',
              idempotencyKey: `loyalty:confirmed:${booking.id}`,
              description: 'امتیاز ثبت و تأیید رزرو',
            },
          });
          const tier = await tx.loyaltyTier.findFirst({
            where: {
              isActive: true,
              minPoints: { lte: updatedLoyalty.points },
              OR: [
                { maxPoints: null },
                { maxPoints: { gte: updatedLoyalty.points } },
              ],
            },
            orderBy: { minPoints: 'desc' },
          });
          if (tier && !loyalty.tierLockedByAdmin) {
            await tx.loyaltyAccount.update({
              where: { id: loyalty.id },
              data: { tierId: tier.id },
            });
            if (tier.id !== loyalty.tierId && tier.code !== 'NORMAL') {
              await tx.notification.create({
                data: {
                  customerId: payment.customerId,
                  recipient: payment.customerId,
                  channel: 'IN_APP',
                  templateCode: 'LOYALTY_TIER_UPGRADE',
                  title: `سطح شما به ${tier.nameFa} ارتقا یافت`,
                  body: 'مزایای سطح جدید در بخش امتیاز و دستاوردها قابل مشاهده است.',
                  actionUrl: '/loyalty',
                  status: 'SENT',
                  sentAt: new Date(),
                },
              });
              await tx.outboxEvent.create({
                data: {
                  aggregateType: 'loyalty',
                  aggregateId: loyalty.id,
                  eventType: 'loyalty.tier.upgraded',
                  idempotencyKey: `loyalty:tier:${booking.id}:${tier.id}`,
                  payload: {
                    bookingId: booking.id,
                    customerId: payment.customerId,
                    tierName: tier.nameFa,
                    templateCode: 'LOYALTY_TIER_UPGRADE',
                  },
                },
              });
            }
          }
          await tx.notification.create({
            data: {
              customerId: payment.customerId,
              recipient: payment.customerId,
              channel: 'IN_APP',
              templateCode: 'LOYALTY_POINTS_EARNED',
              title: `${points.toLocaleString('fa-IR')} امتیاز دریافت کردید`,
              body: 'امتیاز ثبت رزرو به حساب دستاوردهای شما اضافه شد.',
              actionUrl: '/loyalty',
              status: 'SENT',
              sentAt: new Date(),
            },
          });
        }
      }
      await tx.notification.create({
        data: {
          customerId: payment.customerId,
          recipient: payment.customerId ?? payment.customer?.mobile ?? '',
          channel: 'IN_APP',
          templateCode: 'BOOKING_CONFIRMED',
          title:
            booking.source === 'ADMIN_MANUAL'
              ? 'رزرو شما تأیید شد'
              : 'رزرو در حال بررسی است',
          body:
            booking.source === 'ADMIN_MANUAL'
              ? `پرداخت رزرو ${booking.code} موفق بود و زمان مراجعه شما قطعی شد.`
              : `پرداخت رزرو ${booking.code} موفق بود و رزرو برای بررسی مدیر ثبت شد.`,
          actionUrl: `/bookings/${booking.id}`,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      const paidBookingCount = payment.customerId
        ? await tx.booking.count({
            where: { customerId: payment.customerId, paymentStatus: 'PAID' },
          })
        : 0;
      if (payment.customerId) {
        const loyalty = await tx.loyaltyAccount.findUnique({
          where: { customerId: payment.customerId },
          include: { tier: true },
        });
        const eligibleCoupons = await tx.coupon.findMany({
          where: {
            isActive: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
            ],
          },
        });
        for (const coupon of eligibleCoupons) {
          const customerUsageCount = await tx.couponUsage.count({
            where: { couponId: coupon.id, customerId: payment.customerId },
          });
          const totalUsageCount = await tx.couponUsage.count({
            where: { couponId: coupon.id },
          });
          const priorDeliveryCount = await tx.couponPromotionDelivery.count({
            where: { couponId: coupon.id, customerId: payment.customerId },
          });
          const qualifies =
            !coupon.firstBookingOnly &&
            paidBookingCount >= coupon.minimumPriorBookings &&
            payment.checkout.amountRial >= coupon.minimumAmountRial &&
            customerUsageCount < coupon.perCustomerUsage &&
            (!coupon.maxUsage || totalUsageCount < coupon.maxUsage) &&
            (coupon.promotionFrequency !== 'ONCE' ||
              priorDeliveryCount === 0) &&
            (loyalty?.points ?? 0) >= coupon.minimumPoints &&
            (!coupon.eligibleTierCodes.length ||
              Boolean(
                loyalty?.tier &&
                coupon.eligibleTierCodes.includes(loyalty.tier.code),
              ));
          if (!qualifies || !coupon.deliveryChannels.length) continue;
          const delivery =
            coupon.promotionFrequency === 'ONCE'
              ? await tx.couponPromotionDelivery.upsert({
                  where: {
                    singleDeliveryKey: `${coupon.id}:${payment.customerId}`,
                  },
                  update: {},
                  create: {
                    couponId: coupon.id,
                    customerId: payment.customerId,
                    bookingId: booking.id,
                    singleDeliveryKey: `${coupon.id}:${payment.customerId}`,
                  },
                })
              : await tx.couponPromotionDelivery.upsert({
                  where: {
                    couponId_customerId_bookingId: {
                      couponId: coupon.id,
                      customerId: payment.customerId,
                      bookingId: booking.id,
                    },
                  },
                  update: {},
                  create: {
                    couponId: coupon.id,
                    customerId: payment.customerId,
                    bookingId: booking.id,
                  },
                });
          if (delivery.bookingId !== booking.id) continue;
          const templateCode = `COUPON_${coupon.code}`;
          const title = 'هدیه ویژه BestWash برای شما';
          const body = `کد ${coupon.code} برای ${coupon.type === 'PERCENTAGE' ? `${coupon.value.toLocaleString('fa-IR')}٪` : `${coupon.value.toLocaleString('fa-IR')} ریال`} تخفیف فعال شد.`;
          if (coupon.deliveryChannels.includes('IN_APP')) {
            await tx.notification.create({
              data: {
                customerId: payment.customerId,
                recipient: payment.customerId,
                channel: 'IN_APP',
                templateCode,
                title,
                body,
                actionUrl:
                  coupon.displayPlacement === 'HOME' ? '/' : '/booking',
                status: 'SENT',
                sentAt: new Date(),
              },
            });
          }
          if (
            coupon.deliveryChannels.includes('SMS') ||
            coupon.deliveryChannels.includes('PUSH')
          ) {
            await tx.outboxEvent.create({
              data: {
                aggregateType: 'coupon',
                aggregateId: booking.id,
                eventType: 'coupon.offer.granted',
                idempotencyKey: `coupon.offer:${coupon.id}:${payment.customerId}:${booking.id}`,
                payload: {
                  bookingId: booking.id,
                  customerId: payment.customerId,
                  mobile: payment.customer?.mobile,
                  customerName:
                    [
                      payment.customer?.firstName?.trim(),
                      payment.customer?.lastName?.trim(),
                    ]
                      .filter(Boolean)
                      .join(' ')
                      .slice(0, 25) || 'کاربر گرامی',
                  couponCode: coupon.code,
                  discountPercent:
                    coupon.type === 'PERCENTAGE' ? coupon.value : undefined,
                  templateCode: coupon.code,
                  channels: coupon.deliveryChannels,
                  title,
                  body,
                },
              },
            });
          }
        }
      }
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'booking',
          aggregateId: booking.id,
          eventType: 'booking.confirmed',
          idempotencyKey: `booking.confirmed:${booking.id}`,
          payload: {
            bookingId: booking.id,
            bookingCode: booking.code,
            customerId: payment.customerId,
            mobile: payment.customer?.mobile,
            templateCode: 'BOOKING_CONFIRMED',
          },
        },
      });
      return result;
    });
    return this.response(updated);
  }

  private async markFailedAndReleaseWallet(paymentId: string, reason: string) {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status === 'PAID' || payment.status === 'FAILED')
        return;
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED', failedAt: new Date() },
      });
      if (payment.walletAmountRial > 0 && payment.customerId) {
        const wallet = await tx.walletAccount.findUnique({
          where: { customerId: payment.customerId },
        });
        if (wallet) {
          const updated = await tx.walletAccount.update({
            where: { id: wallet.id },
            data: { balanceRial: { increment: payment.walletAmountRial } },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'REVERSAL',
              amountRial: payment.walletAmountRial,
              balanceAfterRial: updated.balanceRial,
              idempotencyKey: `wallet:reversal:${payment.id}`,
              reason,
            },
          });
        }
      }
    });
  }

  async get(customerId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, customerId },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    return this.response(payment);
  }
}
