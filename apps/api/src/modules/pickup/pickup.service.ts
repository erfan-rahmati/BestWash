import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
} from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeIranianMobile } from '../auth/mobile';

const bookingStatusFa: Record<string, string> = {
  CONFIRMED: 'تأیید شده',
  ADMIN_REJECTED: 'رد و بازپرداخت شده',
  CHECKED_IN: 'زمان مراجعه و انتظار پذیرش',
  IN_QUEUE: 'در صف خدمات',
  IN_PROGRESS: 'در حال انجام خدمات',
  READY_FOR_PICKUP: 'آماده تحویل',
  DELIVERED: 'تحویل داده شده',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
  NO_SHOW: 'عدم مراجعه',
};

const transitions: Record<string, string[]> = {
  UNDER_REVIEW: ['CONFIRMED', 'ADMIN_REJECTED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_QUEUE', 'IN_PROGRESS', 'CANCELLED'],
  IN_QUEUE: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
};

@Injectable()
export class PickupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private encryptionSecrets(): string[] {
    const current =
      this.config.get<string>('MESSAGE_SECRET_ENCRYPTION_KEY') ??
      'development-message-key-change-me';
    const previous = this.config.get<string>(
      'MESSAGE_SECRET_ENCRYPTION_KEY_PREVIOUS',
    );

    return [...new Set([current, previous].filter(Boolean) as string[])];
  }

  private encryptionKey(): Buffer {
    return createHash('sha256')
      .update(this.encryptionSecrets()[0])
      .digest();
  }

  private encrypt(code: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(code, 'utf8'),
      cipher.final(),
    ]);
    return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  private decrypt(value: string): string {
    const [iv, tag, encrypted] = value.split('.');
    if (!iv || !tag || !encrypted) {
      throw new Error('Invalid encrypted pickup credential.');
    }

    let lastError: unknown;
    for (const secret of this.encryptionSecrets()) {
      try {
        const key = createHash('sha256').update(secret).digest();
        const decipher = createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(iv, 'base64url'),
        );
        decipher.setAuthTag(Buffer.from(tag, 'base64url'));
        return Buffer.concat([
          decipher.update(Buffer.from(encrypted, 'base64url')),
          decipher.final(),
        ]).toString('utf8');
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('Unable to decrypt pickup credential.');
  }

  async transition(
    bookingId: string,
    toStatus: string,
    actorId: string,
    reason?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        pickupDelegates: { where: { isActive: true } },
        allocations: true,
        payments: true,
      },
    });
    if (!booking) throw new NotFoundException('رزرو پیدا نشد.');
    if (!(transitions[booking.status] ?? []).includes(toStatus)) {
      throw new ConflictException({
        code: 'BOOKING_TRANSITION_INVALID',
        message: `تغییر وضعیت از «${bookingStatusFa[booking.status] ?? 'وضعیت فعلی'}» به «${bookingStatusFa[toStatus] ?? 'وضعیت درخواستی'}» مجاز نیست.`,
      });
    }

    const now = new Date();
    const code =
      toStatus === 'READY_FOR_PICKUP'
        ? String(randomInt(100000, 1_000_000))
        : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: toStatus as never,
          ...(toStatus === 'CHECKED_IN' ? { checkedInAt: now } : {}),
          ...(toStatus === 'IN_PROGRESS' ? { inProgressAt: now } : {}),
          ...(toStatus === 'READY_FOR_PICKUP' ? { readyAt: now } : {}),
          ...(toStatus === 'COMPLETED' ? { completedAt: now } : {}),
          ...(toStatus === 'CANCELLED' ? { cancelledAt: now } : {}),
          ...(toStatus === 'ADMIN_REJECTED'
            ? {
                cancelledAt: now,
                cancellationReason:
                  reason?.trim() || 'رزرو در مهلت مقرر توسط مدیر تأیید نشد',
                paymentStatus: 'REFUNDED' as const,
              }
            : {}),
        },
      });
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: toStatus as never,
          actorType: 'ADMIN',
          actorId,
          reason,
        },
      });

      const statusNotice: Record<
        string,
        { code: string; title: string; body: string }
      > = {
        CONFIRMED: {
          code: 'BOOKING_CONFIRMED',
          title: 'رزرو توسط مدیر تأیید شد',
          body: 'زمان مراجعه رزرو شما نهایی شد.',
        },
        ADMIN_REJECTED: {
          code: 'BOOKING_CANCELLED',
          title: 'رزرو توسط مدیر تأیید نشد',
          body: 'مبلغ پرداختی به کیف پول شما بازگردانده شد.',
        },
        CHECKED_IN: {
          code: 'CAR_CHECKED_IN',
          title: 'خودرو پذیرش شد',
          body: 'خودروی شما در مجموعه پذیرش شد.',
        },
        IN_QUEUE: {
          code: 'CAR_CHECKED_IN',
          title: 'خودرو در صف شست‌وشو است',
          body: 'خودروی شما در صف دریافت خدمات قرار گرفت.',
        },
        IN_PROGRESS: {
          code: 'CAR_IN_PROGRESS',
          title: 'خدمت خودرو آغاز شد',
          body: 'خودروی شما اکنون در حال دریافت خدمات است.',
        },
        READY_FOR_PICKUP: {
          code: 'CAR_READY',
          title: 'خودرو آماده تحویل است',
          body: 'خدمت خودرو تکمیل شده و خودرو آماده تحویل است.',
        },
        COMPLETED: {
          code: 'BOOKING_COMPLETED',
          title: 'رزرو تکمیل شد',
          body: 'خدمت رزرو شما با موفقیت تکمیل شد. از انتخاب BestWash متشکریم.',
        },
      };
      const notice = statusNotice[toStatus];
      if (notice && booking.customerId) {
        await tx.notification.create({
          data: {
            customerId: booking.customerId,
            recipient: booking.customerId,
            channel: 'IN_APP',
            templateCode: notice.code,
            title: notice.title,
            body: notice.body,
            actionUrl: `/bookings/${booking.id}`,
            status: 'SENT',
            sentAt: now,
          },
        });
        if (toStatus !== 'READY_FOR_PICKUP') {
          await tx.outboxEvent.create({
            data: {
              aggregateType: 'booking',
              aggregateId: booking.id,
              eventType: `booking.status.${toStatus.toLowerCase()}`,
              idempotencyKey: `booking.status:${booking.id}:${toStatus}`,
              payload: {
                bookingId: booking.id,
                bookingCode: booking.code,
                customerId: booking.customerId,
                mobile: booking.customer?.mobile,
                templateCode: notice.code,
              },
            },
          });
        }
      }

      if (toStatus === 'ADMIN_REJECTED' && booking.customerId) {
        const refundAmountRial =
          booking.walletAmountRial + booking.gatewayAmountRial;
        const wallet = await tx.walletAccount.upsert({
          where: { customerId: booking.customerId },
          update: {},
          create: { customerId: booking.customerId },
        });
        const existingRefund = await tx.walletTransaction.findUnique({
          where: { idempotencyKey: `admin-rejection:refund:${booking.id}` },
        });
        if (!existingRefund && refundAmountRial > 0) {
          const updatedWallet = await tx.walletAccount.update({
            where: { id: wallet.id },
            data: { balanceRial: { increment: refundAmountRial } },
          });
          const transaction = await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              bookingId: booking.id,
              type: 'REFUND',
              amountRial: refundAmountRial,
              balanceAfterRial: updatedWallet.balanceRial,
              idempotencyKey: `admin-rejection:refund:${booking.id}`,
              reason: 'بازپرداخت به علت تأییدنشدن رزرو توسط مدیر',
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
                reason: reason?.trim() || 'تأییدنشدن رزرو توسط مدیر',
                createdByAdminId: actorId,
                processedAt: now,
              },
            });
          }
        }
        for (const allocation of booking.allocations) {
          await tx.bookingCapacityBucket.updateMany({
            where: { startsAt: allocation.startsAt, usedCapacity: { gt: 0 } },
            data: { usedCapacity: { decrement: 1 } },
          });
        }
      }

      if (code) {
        await tx.pickupCredential.upsert({
          where: { bookingId: booking.id },
          update: {
            codeHash: await hash(code, 12),
            codeCiphertext: this.encrypt(code),
            attempts: 0,
            lockedUntil: null,
            consumedAt: null,
            rotatedAt: now,
          },
          create: {
            bookingId: booking.id,
            codeHash: await hash(code, 12),
            codeCiphertext: this.encrypt(code),
          },
        });
        const delegate = booking.pickupDelegates[0];
        const recipient =
          booking.pickupMode === 'DELEGATE'
            ? delegate?.mobile
            : booking.customer?.mobile;
        if (recipient) {
          await tx.outboxEvent.create({
            data: {
              aggregateType: 'booking',
              aggregateId: booking.id,
              eventType: 'booking.ready',
              idempotencyKey: `booking.ready:${booking.id}:${now.getTime()}`,
              payload: {
                bookingId: booking.id,
                bookingCode: booking.code,
                customerId: booking.customerId,
                mobile: recipient,
                secretCiphertext: this.encrypt(code),
                templateCode:
                  booking.pickupMode === 'DELEGATE'
                    ? 'PICKUP_CODE_DELEGATE'
                    : 'PICKUP_CODE_OWNER',
              },
            },
          });
        }
      }

      if (toStatus === 'COMPLETED' && booking.customerId) {
        await this.rewardCompletion(
          tx,
          booking.id,
          booking.customerId,
          booking.gatewayAmountRial,
        );
      }
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'BOOKING_STATUS_CHANGED',
          entityType: 'Booking',
          entityId: booking.id,
          before: { status: booking.status },
          after: { status: toStatus },
        },
      });
      await tx.adminNotification.create({
        data: {
          adminUserId: actorId,
          type: 'BOOKING_STATUS_CHANGED',
          title: 'وضعیت رزرو به‌روزرسانی شد',
          body: `رزرو ${booking.code} به وضعیت «${bookingStatusFa[toStatus] ?? 'به‌روزشده'}» منتقل شد.`,
          actionUrl: '/admin/bookings',
          entityType: 'Booking',
          entityId: booking.id,
          readAt: new Date(),
        },
      });
    });
    return this.prisma.booking.findUnique({ where: { id: booking.id } });
  }

  private async rewardCompletion(
    tx: Prisma.TransactionClient,
    bookingId: string,
    customerId: string,
    gatewayAmountRial: number,
  ) {
    const cashbackSetting = await tx.businessSetting.findUnique({
      where: { key: 'cashbackPercent' },
    });
    const cashbackEnabledSetting = await tx.businessSetting.findUnique({
      where: { key: 'cashbackEnabled' },
    });
    const expirySetting = await tx.businessSetting.findUnique({
      where: { key: 'cashbackExpiryDays' },
    });
    const rate =
      typeof cashbackSetting?.value === 'number' ? cashbackSetting.value : 10;
    const expiryDays =
      typeof expirySetting?.value === 'number' ? expirySetting.value : 90;
    const cashbackEnabled =
      typeof cashbackEnabledSetting?.value === 'boolean'
        ? cashbackEnabledSetting.value
        : true;
    const cashback = cashbackEnabled
      ? Math.floor((gatewayAmountRial * rate) / 100)
      : 0;
    const wallet = await tx.walletAccount.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
    });

    if (cashback > 0) {
      const existing = await tx.walletTransaction.findUnique({
        where: { idempotencyKey: `cashback:${bookingId}` },
      });
      if (!existing) {
        const updated = await tx.walletAccount.update({
          where: { id: wallet.id },
          data: { balanceRial: { increment: cashback } },
        });
        const transaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            bookingId,
            type: 'CASHBACK',
            amountRial: cashback,
            balanceAfterRial: updated.balanceRial,
            idempotencyKey: `cashback:${bookingId}`,
            reason: `Cashback ${rate}%`,
          },
        });
        await tx.walletCreditLot.create({
          data: {
            walletId: wallet.id,
            originalAmountRial: cashback,
            remainingAmountRial: cashback,
            sourceTransactionId: transaction.id,
            expiresAt: new Date(Date.now() + expiryDays * 86_400_000),
          },
        });
        await tx.notification.create({
          data: {
            customerId,
            recipient: customerId,
            channel: 'IN_APP',
            templateCode: 'CASHBACK_EARNED',
            title: 'اعتبار بازگشتی دریافت کردید',
            body: `${Math.round(cashback / 10).toLocaleString('fa-IR')} تومان به کیف پول شما اضافه شد.`,
            actionUrl: '/wallet',
            status: 'SENT',
            sentAt: new Date(),
          },
        });
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'wallet',
            aggregateId: wallet.id,
            eventType: 'wallet.cashback.earned',
            idempotencyKey: `cashback.notification:${bookingId}`,
            payload: {
              bookingId,
              customerId,
              cashbackAmountRial: cashback,
              templateCode: 'CASHBACK_EARNED',
            },
          },
        });
      }
    }

    const rule = await tx.loyaltyRule.findFirst({
      where: { eventName: 'booking.completed', isActive: true },
    });
    const points = rule?.points ?? 0;
    const account = await tx.loyaltyAccount.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
    });
    const existingPoints = await tx.loyaltyTransaction.findUnique({
      where: { idempotencyKey: `loyalty:${bookingId}` },
    });
    if (!existingPoints && points > 0) {
      const updated = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { increment: points } },
      });
      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          bookingId,
          points,
          type: 'BOOKING_COMPLETED',
          idempotencyKey: `loyalty:${bookingId}`,
          description: 'امتیاز رزرو تکمیل‌شده',
        },
      });
      const tier = await tx.loyaltyTier.findFirst({
        where: {
          isActive: true,
          minPoints: { lte: updated.points },
          OR: [{ maxPoints: null }, { maxPoints: { gte: updated.points } }],
        },
        orderBy: { minPoints: 'desc' },
      });
      if (tier && !account.tierLockedByAdmin)
        await tx.loyaltyAccount.update({
          where: { id: account.id },
          data: { tierId: tier.id },
        });
    }
  }

  async verifyCode(bookingId: string, code: string, actorId: string) {
    const credential = await this.prisma.pickupCredential.findUnique({
      where: { bookingId },
      include: { booking: true },
    });
    if (
      !credential ||
      credential.booking.status !== 'READY_FOR_PICKUP' ||
      credential.consumedAt
    ) {
      throw new ConflictException({
        code: 'PICKUP_NOT_READY',
        message: 'این رزرو آماده تحویل نیست.',
      });
    }
    if (credential.lockedUntil && credential.lockedUntil > new Date()) {
      throw new HttpException(
        { code: 'PICKUP_LOCKED', message: 'ورود کد موقتاً قفل شده است.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!(await compare(code, credential.codeHash))) {
      const attempts = credential.attempts + 1;
      await this.prisma.$transaction([
        this.prisma.pickupCredential.update({
          where: { id: credential.id },
          data: {
            attempts,
            ...(attempts >= credential.maxAttempts
              ? { lockedUntil: new Date(Date.now() + 15 * 60_000) }
              : {}),
          },
        }),
        this.prisma.securityEvent.create({
          data: {
            eventType: 'PICKUP_CODE_FAILED',
            severity: 'WARN',
            actorType: 'ADMIN',
            actorId,
            metadata: { bookingId, attempts },
          },
        }),
      ]);
      throw new BadRequestException({
        code: 'PICKUP_CODE_INVALID',
        message: 'کد تحویل صحیح نیست.',
      });
    }
    const deliveredAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.pickupCredential.update({
        where: { id: credential.id },
        data: { consumedAt: deliveredAt },
      });
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'DELIVERED', deliveredAt },
      });
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: 'READY_FOR_PICKUP',
          toStatus: 'DELIVERED',
          actorType: 'ADMIN',
          actorId,
          reason: 'PICKUP_CODE_VERIFIED',
        },
      });
      if (credential.booking.customerId) {
        await tx.notification.create({
          data: {
            customerId: credential.booking.customerId,
            recipient: credential.booking.customerId,
            channel: 'IN_APP',
            templateCode: 'CAR_DELIVERED',
            title: 'خودرو تحویل داده شد',
            body: `تحویل خودرو برای رزرو ${credential.booking.code} با موفقیت ثبت شد.`,
            actionUrl: `/bookings/${bookingId}`,
            status: 'SENT',
            sentAt: deliveredAt,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'PICKUP_CODE_VERIFIED',
          entityType: 'Booking',
          entityId: bookingId,
          before: { status: 'READY_FOR_PICKUP' },
          after: { status: 'DELIVERED' },
        },
      });
      await tx.adminNotification.create({
        data: {
          adminUserId: actorId,
          type: 'CAR_DELIVERED',
          title: 'تحویل خودرو ثبت شد',
          body: `رزرو ${credential.booking.code} با کد امن به مشتری تحویل داده شد.`,
          actionUrl: '/admin/bookings',
          entityType: 'Booking',
          entityId: bookingId,
          readAt: deliveredAt,
        },
      });
    });
    return { success: true };
  }

  async codeForCustomer(bookingId: string, customerId: string) {
    const credential = await this.prisma.pickupCredential.findFirst({
      where: { bookingId, booking: { customerId } },
    });
    if (!credential || credential.consumedAt) return { code: null };
    return { code: this.decrypt(credential.codeCiphertext) };
  }

  async updateDelegate(
    bookingId: string,
    customerId: string,
    input: {
      pickupMode: 'OWNER' | 'DELEGATE';
      fullName?: string;
      mobile?: string;
    },
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, customerId },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (
      ['DELIVERED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(
        booking.status,
      )
    ) {
      throw new ConflictException('Delegate can no longer be changed.');
    }
    if (booking.status === 'READY_FOR_PICKUP') {
      const owner = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      const verified = owner
        ? await this.prisma.otpChallenge.findFirst({
            where: {
              mobile: owner.mobile,
              purpose: 'DELEGATE_CHANGE',
              consumedAt: { gte: new Date(Date.now() - 5 * 60_000) },
            },
            orderBy: { consumedAt: 'desc' },
          })
        : null;
      if (!verified) {
        throw new ConflictException({
          code: 'OWNER_OTP_REQUIRED',
          message: 'برای تغییر تحویل‌گیرنده، کد تأیید مالک را وارد کنید.',
        });
      }
    }
    if (input.pickupMode === 'DELEGATE' && (!input.fullName || !input.mobile)) {
      throw new BadRequestException('Delegate name and mobile are required.');
    }
    const mobile = input.mobile ? normalizeIranianMobile(input.mobile) : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.pickupDelegate.updateMany({
        where: { bookingId, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });
      if (input.pickupMode === 'DELEGATE' && mobile) {
        await tx.pickupDelegate.create({
          data: { bookingId, fullName: input.fullName!, mobile },
        });
      }
      await tx.booking.update({
        where: { id: bookingId },
        data: { pickupMode: input.pickupMode },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'CUSTOMER',
          actorId: customerId,
          action: 'PICKUP_DELEGATE_CHANGED',
          entityType: 'Booking',
          entityId: bookingId,
          after: {
            pickupMode: input.pickupMode,
            mobile: mobile
              ? `${mobile.slice(0, 5)}***${mobile.slice(-3)}`
              : null,
          },
        },
      });
    });
    if (booking.status === 'READY_FOR_PICKUP') {
      await this.rotateCode(bookingId);
    }
    return { success: true };
  }

  private async rotateCode(bookingId: string) {
    const code = String(randomInt(100000, 1_000_000));
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pickupDelegates: { where: { isActive: true } },
        customer: true,
      },
    });
    if (!booking) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.pickupCredential.update({
        where: { bookingId },
        data: {
          codeHash: await hash(code, 12),
          codeCiphertext: this.encrypt(code),
          attempts: 0,
          lockedUntil: null,
          consumedAt: null,
          rotatedAt: new Date(),
        },
      });
      const recipient =
        booking.pickupMode === 'DELEGATE'
          ? booking.pickupDelegates[0]?.mobile
          : booking.customer?.mobile;
      if (recipient) {
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'booking',
            aggregateId: bookingId,
            eventType: 'pickup.code.rotated',
            idempotencyKey: `pickup.rotated:${bookingId}:${Date.now()}`,
            payload: {
              bookingId,
              bookingCode: booking.code,
              mobile: recipient,
              secretCiphertext: this.encrypt(code),
              templateCode: 'PICKUP_DELEGATE_CHANGED',
            },
          },
        });
      }
    });
  }
}
