import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { DateTime } from 'luxon';
import {
  createCipheriv,
  createHash,
  randomBytes,
  randomInt,
} from 'node:crypto';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeIranianMobile } from '../auth/mobile';
import { BookingCheckoutsService } from '../booking-checkouts/booking-checkouts.service';
import { BookingHoldsService } from '../booking-holds/booking-holds.service';
import { PaymentsService } from '../payments/payments.service';
import { PickupService } from '../pickup/pickup.service';
import type {
  AdminPushSubscriptionDto,
  ManualBookingDto,
  MediaUploadDto,
  ScheduleOverrideDto,
  ScheduleRuleDto,
  ScheduleTimeBlockDto,
} from './admin.dto';

const protectedBusinessSettingKeys = new Set(['adminTwoFactorEnabled']);

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly holds: BookingHoldsService,
    private readonly checkouts: BookingCheckoutsService,
    private readonly payments: PaymentsService,
    private readonly pickup: PickupService,
  ) {}

  private sha(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private encryptMessageSecret(value: string): string {
    const configured = this.config.get<string>('MESSAGE_SECRET_ENCRYPTION_KEY');
    if (!configured) {
      throw new BadRequestException({
        code: 'MESSAGE_ENCRYPTION_NOT_CONFIGURED',
        message: 'کلید رمزنگاری پیامک در محیط اجرا تنظیم نشده است.',
      });
    }
    const key = createHash('sha256').update(configured).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  async login(
    rawUsername: string,
    password: string,
    otpCode: string | undefined,
    challengeId: string | undefined,
    context: { ip?: string; userAgent?: string },
  ) {
    const username = rawUsername.trim().toLowerCase();
    const admin = await this.prisma.adminUser.findUnique({
      where: { username },
    });
    if (
      !admin ||
      admin.status !== 'ACTIVE' ||
      !(await compare(password, admin.passwordHash))
    ) {
      await this.prisma.securityEvent.create({
        data: {
          eventType: 'ADMIN_LOGIN_FAILED',
          severity: 'WARN',
          ipAddress: context.ip,
        },
      });
      throw new UnauthorizedException({
        code: 'ADMIN_LOGIN_INVALID',
        message: 'اطلاعات ورود صحیح نیست.',
      });
    }
    // Administrative two-factor authentication is mandatory and cannot be
    // disabled through editable business settings.
    {
      if (!challengeId || !otpCode) {
        const code = String(randomInt(100000, 1_000_000));
        const expiresAt = new Date(Date.now() + 3 * 60_000);
        const challenge = await this.prisma.otpChallenge.create({
          data: {
            mobile: admin.mobile,
            purpose: 'ADMIN_LOGIN',
            codeHash: this.sha(
              `${this.config.get<string>('OTP_PEPPER') ?? 'development'}:${code}`,
            ),
            expiresAt,
            ipAddress: context.ip,
          },
        });
        await this.prisma.outboxEvent.create({
          data: {
            aggregateType: 'admin',
            aggregateId: admin.id,
            eventType: 'admin.login.otp',
            idempotencyKey: `admin.login.otp:${challenge.id}`,
            payload: {
              mobile: admin.mobile,
              secretCiphertext: this.encryptMessageSecret(code),
              templateCode: 'ADMIN_LOGIN_OTP',
            },
          },
        });
        return {
          requiresTwoFactor: true as const,
          challengeId: challenge.id,
          expiresAt,
          ...(this.config.get<string>('NODE_ENV') !== 'production' &&
          this.config.get<string>('EXPOSE_TEST_OTP') === 'true'
            ? { developmentCode: code }
            : {}),
        };
      }
      const challenge = await this.prisma.otpChallenge.findFirst({
        where: {
          id: challengeId,
          mobile: admin.mobile,
          purpose: 'ADMIN_LOGIN',
          consumedAt: null,
        },
      });
      const expected = this.sha(
        `${this.config.get<string>('OTP_PEPPER') ?? 'development'}:${otpCode}`,
      );
      if (
        !challenge ||
        challenge.expiresAt <= new Date() ||
        challenge.attempts >= challenge.maxAttempts ||
        challenge.codeHash !== expected
      ) {
        if (challenge) {
          await this.prisma.otpChallenge.update({
            where: { id: challenge.id },
            data: { attempts: { increment: 1 } },
          });
        }
        await this.prisma.securityEvent.create({
          data: {
            eventType: 'ADMIN_2FA_FAILED',
            actorType: 'ADMIN',
            actorId: admin.id,
            severity: 'WARN',
            ipAddress: context.ip,
          },
        });
        throw new UnauthorizedException({
          code: 'ADMIN_2FA_INVALID',
          message: 'کد ورود دومرحله‌ای صحیح نیست یا منقضی شده است.',
        });
      }
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
    }
    const provisional = await this.prisma.adminSession.create({
      data: {
        adminUserId: admin.id,
        tokenHash: this.sha(`${admin.id}:${Date.now()}:${Math.random()}`),
        expiresAt: new Date(Date.now() + 12 * 60 * 60_000),
        ipAddress: context.ip,
        userAgent: context.userAgent,
      },
    });
    const secret =
      this.config.get<string>('JWT_ADMIN_SECRET') ??
      'development-admin-secret-change-me';
    const token = await this.jwt.signAsync(
      { sub: admin.id, sid: provisional.id, type: 'admin' },
      { secret, expiresIn: 12 * 60 * 60 },
    );
    await this.prisma.$transaction([
      this.prisma.adminSession.update({
        where: { id: provisional.id },
        data: { tokenHash: this.sha(token) },
      }),
      this.prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);
    return {
      token,
      admin: {
        id: admin.id,
        displayName: admin.displayName,
      },
    };
  }

  async validateToken(token: string) {
    const secret =
      this.config.get<string>('JWT_ADMIN_SECRET') ??
      'development-admin-secret-change-me';
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        sid: string;
        type: string;
      }>(token, { secret });
      if (payload.type !== 'admin') throw new Error('wrong type');
      const session = await this.prisma.adminSession.findUnique({
        where: { id: payload.sid },
        include: {
          adminUser: {
            include: {
              roles: {
                include: {
                  role: {
                    include: { permissions: { include: { permission: true } } },
                  },
                },
              },
            },
          },
        },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        session.tokenHash !== this.sha(token) ||
        session.adminUser.status !== 'ACTIVE'
      ) {
        throw new Error('invalid session');
      }
      const permissions = [
        ...new Set(
          session.adminUser.roles.flatMap((item) =>
            item.role.permissions.map((entry) => entry.permission.code),
          ),
        ),
      ];
      return { adminId: payload.sub, sessionId: payload.sid, permissions };
    } catch {
      throw new UnauthorizedException({
        code: 'ADMIN_AUTH_REQUIRED',
        message: 'ورود مدیر لازم است.',
      });
    }
  }

  async logout(sessionId: string) {
    await this.prisma.adminSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async profile(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        mobile: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { code: true, nameFa: true } } } },
      },
    });
    if (!admin) {
      throw new NotFoundException({
        code: 'ADMIN_NOT_FOUND',
        message: 'حساب مدیر پیدا نشد.',
      });
    }
    return {
      ...admin,
      mobile: `${admin.mobile.slice(0, 5)}***${admin.mobile.slice(-3)}`,
      roles: admin.roles.map((item) => item.role),
    };
  }

  async adminNotifications(adminId: string) {
    const items = await this.prisma.adminNotification.findMany({
      where: { OR: [{ adminUserId: adminId }, { adminUserId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    return {
      unreadCount: items.filter((item) => !item.readAt).length,
      items,
      pushPublicKey: this.config.get<string>('WEB_PUSH_PUBLIC_KEY') ?? null,
    };
  }

  async readAdminNotification(adminId: string, id: string) {
    const notification = await this.prisma.adminNotification.findFirst({
      where: { id, OR: [{ adminUserId: adminId }, { adminUserId: null }] },
      select: { id: true },
    });
    if (!notification) {
      throw new NotFoundException({
        code: 'ADMIN_NOTIFICATION_NOT_FOUND',
        message: 'اعلان مدیریت پیدا نشد.',
      });
    }
    return this.prisma.adminNotification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }

  saveAdminPushSubscription(
    adminId: string,
    dto: AdminPushSubscriptionDto,
    userAgent?: string,
  ) {
    return this.prisma.adminPushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        adminUserId: adminId,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent,
        isActive: true,
      },
      create: {
        adminUserId: adminId,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent,
      },
    });
  }

  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const sevenDaysAgo = new Date(today.getTime() - 6 * 86_400_000);
    const [
      todayBookings,
      futureBookings,
      ready,
      inProgress,
      newCustomers,
      revenue,
      totalRevenue,
      recentBookings,
      statusGroups,
      pendingReview,
      recentPayments,
      openTickets,
      revenueRows,
    ] = await Promise.all([
      this.prisma.booking.count({
        where: { startsAt: { gte: today, lt: tomorrow } },
      }),
      this.prisma.booking.count({
        where: {
          startsAt: { gte: new Date() },
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'IN_QUEUE'] },
        },
      }),
      this.prisma.booking.count({ where: { status: 'READY_FOR_PICKUP' } }),
      this.prisma.booking.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.customer.count({ where: { createdAt: { gte: today } } }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', verifiedAt: { gte: today } },
        _sum: { gatewayAmountRial: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { gatewayAmountRial: true },
      }),
      this.prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          code: true,
          status: true,
          source: true,
          startsAt: true,
          totalAmountRial: true,
          customer: {
            select: { mobile: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.booking.findMany({
        where: { status: 'UNDER_REVIEW' },
        orderBy: { startsAt: 'asc' },
        take: 6,
        include: {
          customer: {
            select: { mobile: true, firstName: true, lastName: true },
          },
          vehicleClass: { select: { nameFa: true } },
        },
      }),
      this.prisma.payment.findMany({
        orderBy: { requestedAt: 'desc' },
        take: 6,
        include: {
          customer: {
            select: { mobile: true, firstName: true, lastName: true },
          },
          booking: { select: { code: true } },
        },
      }),
      this.prisma.supportTicket.findMany({
        where: { status: { not: 'CLOSED' } },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          customer: {
            select: { mobile: true, firstName: true, lastName: true },
          },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          status: 'PAID',
          verifiedAt: { gte: sevenDaysAgo },
        },
        select: { gatewayAmountRial: true, verifiedAt: true },
      }),
    ]);
    const revenueByDay = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(sevenDaysAgo.getTime() + index * 86_400_000);
      const next = new Date(day.getTime() + 86_400_000);
      return {
        date: day.toISOString(),
        amountRial: revenueRows
          .filter(
            (payment) =>
              payment.verifiedAt &&
              payment.verifiedAt >= day &&
              payment.verifiedAt < next,
          )
          .reduce((sum, payment) => sum + payment.gatewayAmountRial, 0),
      };
    });
    return {
      todayBookings,
      futureBookings,
      ready,
      inProgress,
      newCustomers,
      revenueRial: revenue._sum.gatewayAmountRial ?? 0,
      totalRevenueRial: totalRevenue._sum.gatewayAmountRial ?? 0,
      recentBookings,
      statusGroups,
      pendingReview,
      recentPayments,
      openTickets,
      revenueByDay,
    };
  }

  listBookings(source?: 'CUSTOMER_APP' | 'ADMIN_MANUAL') {
    return this.prisma.booking.findMany({
      where: source ? { source } : {},
      orderBy: { startsAt: 'desc' },
      take: 200,
      include: {
        customer: { select: { mobile: true, firstName: true, lastName: true } },
        vehicleClass: { select: { nameFa: true } },
        payments: {
          select: {
            status: true,
            gatewayAmountRial: true,
            walletAmountRial: true,
          },
        },
      },
    });
  }

  async createManual(adminId: string, dto: ManualBookingDto) {
    const mobile = normalizeIranianMobile(dto.mobile);
    const customer = await this.prisma.customer.upsert({
      where: { mobile },
      update: {},
      create: { mobile },
    });
    await this.prisma.walletAccount.upsert({
      where: { customerId: customer.id },
      update: {},
      create: { customerId: customer.id },
    });
    const hold = await this.holds.create({
      vehicleClassId: dto.vehicleClassId,
      packageId: dto.packageId,
      addonIds: dto.addonIds,
      startAt: dto.startAt,
    });
    const checkout = await this.checkouts.create({
      holdToken: hold.token,
      vehicle: dto.vehicle,
    });
    const delegate = dto.delegate
      ? {
          fullName: dto.delegate.fullName,
          mobile: normalizeIranianMobile(dto.delegate.mobile),
        }
      : null;
    const updated = await this.prisma.bookingCheckout.update({
      where: { id: checkout.id },
      data: {
        customerId: customer.id,
        source: 'ADMIN_MANUAL',
        createdByAdminId: adminId,
        pickupMode: dto.pickupMode,
        delegateSnapshot: delegate ?? Prisma.JsonNull,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'MANUAL_BOOKING_CHECKOUT_CREATED',
        entityType: 'BookingCheckout',
        entityId: updated.id,
        after: {
          customerId: customer.id,
          source: 'ADMIN_MANUAL',
          amountRial: updated.amountRial,
        },
      },
    });
    return { checkout: updated, customer };
  }

  async payManual(
    adminId: string,
    checkoutToken: string,
    idempotencyKey: string,
  ) {
    const checkout = await this.prisma.bookingCheckout.findUnique({
      where: { token: checkoutToken },
    });
    if (
      !checkout ||
      checkout.source !== 'ADMIN_MANUAL' ||
      !checkout.customerId
    ) {
      throw new NotFoundException('Manual checkout not found.');
    }
    if (checkout.createdByAdminId !== adminId) {
      throw new ConflictException(
        'Manual checkout belongs to another admin session.',
      );
    }
    const payment = await this.payments.initiate(
      checkout.customerId,
      checkout.token,
      false,
      idempotencyKey,
    );
    if ('redirectUrl' in payment && payment.redirectUrl) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: checkout.customerId },
        select: { mobile: true },
      });
      if (customer)
        await this.prisma.outboxEvent.create({
          data: {
            aggregateType: 'payment',
            aggregateId: payment.id,
            eventType: 'admin.manual.payment-link',
            idempotencyKey: `manual.payment-link:${payment.id}`,
            payload: {
              customerId: checkout.customerId,
              mobile: customer.mobile,
              templateCode: 'PAYMENT_LINK',
              paymentLink: payment.redirectUrl,
            },
          },
        });
    }
    return payment;
  }

  transition(
    bookingId: string,
    status: string,
    adminId: string,
    reason?: string,
  ) {
    return this.pickup.transition(bookingId, status, adminId, reason);
  }

  verifyPickup(bookingId: string, code: string, adminId: string) {
    return this.pickup.verifyCode(bookingId, code, adminId);
  }

  listPayments() {
    return this.prisma.payment.findMany({
      orderBy: { requestedAt: 'desc' },
      take: 200,
      include: {
        customer: { select: { mobile: true } },
        booking: { select: { code: true } },
      },
    });
  }

  listCustomers() {
    return this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        wallet: true,
        loyalty: { include: { tier: true } },
        _count: { select: { bookings: true } },
      },
    });
  }

  async updateCustomerTier(
    adminId: string,
    customerId: string,
    tierId: string,
  ) {
    const [customer, tier] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: customerId } }),
      this.prisma.loyaltyTier.findFirst({
        where: { id: tierId, isActive: true },
      }),
    ]);
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'مشتری پیدا نشد.',
      });
    }
    if (!tier) {
      throw new BadRequestException({
        code: 'LOYALTY_TIER_INVALID',
        message: 'نوع کاربری انتخاب‌شده معتبر نیست.',
      });
    }
    const account = await this.prisma.loyaltyAccount.upsert({
      where: { customerId },
      update: { tierId, tierLockedByAdmin: true },
      create: { customerId, tierId, tierLockedByAdmin: true },
      include: { tier: true },
    });
    await this.audit(adminId, 'CUSTOMER_TIER_CHANGED', 'Customer', customerId, {
      tierId,
      tierCode: tier.code,
    });
    return account;
  }

  async sendPickupReminder(
    bookingId: string,
    adminId: string,
    message?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: { select: { id: true, mobile: true } } },
    });
    if (!booking || !booking.customer) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'رزرو یا مالک خودرو پیدا نشد.',
      });
    }
    if (booking.status !== 'READY_FOR_PICKUP') {
      throw new ConflictException({
        code: 'BOOKING_NOT_READY_FOR_PICKUP',
        message: 'یادآوری تحویل فقط برای خودروی آماده تحویل قابل ارسال است.',
      });
    }
    const body =
      message?.trim() ||
      'خودروی شما آماده تحویل است. لطفاً برای دریافت خودرو به مجموعه مراجعه کنید.';
    await this.prisma.$transaction([
      this.prisma.outboxEvent.create({
        data: {
          aggregateType: 'booking',
          aggregateId: booking.id,
          eventType: 'booking.pickup.reminder',
          idempotencyKey: `booking.pickup.reminder:${booking.id}:${Date.now()}`,
          payload: {
            bookingId: booking.id,
            bookingCode: booking.code,
            customerId: booking.customer.id,
            mobile: booking.customer.mobile,
            templateCode: 'PICKUP_REMINDER_OWNER',
            body,
          },
        },
      }),
      this.prisma.notification.create({
        data: {
          customerId: booking.customer.id,
          recipient: booking.customer.id,
          channel: 'IN_APP',
          templateCode: 'PICKUP_REMINDER_OWNER',
          title: 'یادآوری تحویل خودرو',
          body,
          actionUrl: `/bookings/${booking.id}`,
          status: 'SENT',
          sentAt: new Date(),
        },
      }),
      this.prisma.adminNotification.create({
        data: {
          adminUserId: adminId,
          type: 'PICKUP_REMINDER_SENT',
          title: 'یادآوری تحویل ارسال شد',
          body: `یادآوری تحویل رزرو ${booking.code} برای مالک خودرو ارسال شد.`,
          actionUrl: '/admin/bookings',
          entityType: 'Booking',
          entityId: booking.id,
          readAt: new Date(),
        },
      }),
    ]);
    await this.audit(adminId, 'PICKUP_REMINDER_SENT', 'Booking', booking.id, {
      recipient: 'OWNER',
    });
    return { success: true };
  }

  async schedule() {
    const timezone =
      this.config.get<string>('BUSINESS_TIMEZONE') ?? 'Asia/Tehran';
    const today = DateTime.now().setZone(timezone);
    const todayDate = DateTime.utc(
      today.year,
      today.month,
      today.day,
    ).toJSDate();
    const [rules, overrides, timeBlocks] = await Promise.all([
      this.prisma.bookingScheduleRule.findMany({ orderBy: { weekday: 'asc' } }),
      this.prisma.bookingScheduleOverride.findMany({
        where: {
          localDate: { gte: todayDate },
        },
        orderBy: { localDate: 'asc' },
        take: 180,
      }),
      this.prisma.bookingScheduleTimeBlock.findMany({
        where: {
          localDate: { gte: todayDate },
        },
        orderBy: [{ localDate: 'asc' }, { startMinute: 'asc' }],
        take: 500,
      }),
    ]);
    return {
      rules,
      overrides,
      timeBlocks,
      range: { startMinute: 360, endMinute: 1440 },
    };
  }

  async saveScheduleRule(
    adminId: string,
    weekday: number,
    dto: ScheduleRuleDto,
  ) {
    if (weekday !== dto.weekday || dto.closeMinute <= dto.openMinute) {
      throw new BadRequestException({
        code: 'SCHEDULE_RULE_INVALID',
        message: 'ساعت پایان باید پس از ساعت شروع باشد.',
      });
    }
    const result = await this.prisma.bookingScheduleRule.upsert({
      where: { weekday },
      update: {
        isOpen: dto.isOpen,
        openMinute: dto.openMinute,
        closeMinute: dto.closeMinute,
        capacity: dto.capacity,
        slotStepMinutes: 30,
      },
      create: {
        weekday,
        isOpen: dto.isOpen,
        openMinute: dto.openMinute,
        closeMinute: dto.closeMinute,
        capacity: dto.capacity,
        slotStepMinutes: 30,
      },
    });
    await this.audit(
      adminId,
      'SCHEDULE_RULE_SAVED',
      'BookingScheduleRule',
      result.id,
      {
        weekday,
      },
    );
    return result;
  }

  async saveScheduleOverride(adminId: string, dto: ScheduleOverrideDto) {
    if (
      !dto.isClosed &&
      dto.openMinute != null &&
      dto.closeMinute != null &&
      dto.closeMinute <= dto.openMinute
    ) {
      throw new BadRequestException({
        code: 'SCHEDULE_OVERRIDE_INVALID',
        message: 'ساعت پایان باید پس از ساعت شروع باشد.',
      });
    }
    const timezone =
      this.config.get<string>('BUSINESS_TIMEZONE') ?? 'Asia/Tehran';
    const localDay = DateTime.fromISO(dto.localDate.slice(0, 10), {
      zone: timezone,
    }).startOf('day');
    if (!localDay.isValid) {
      throw new BadRequestException({
        code: 'SCHEDULE_OVERRIDE_DATE_INVALID',
        message: 'تاریخ انتخاب‌شده معتبر نیست.',
      });
    }
    const dayStartsAt = localDay.toUTC();
    const dayEndsAt = localDay.plus({ days: 1 }).toUTC();
    const availabilityStartsAt = localDay
      .plus({ minutes: dto.openMinute ?? 0 })
      .toUTC();
    const availabilityEndsAt = localDay
      .plus({ minutes: dto.closeMinute ?? 1440 })
      .toUTC();
    const blocksExistingReservations = dto.isClosed
      ? {
          startsAt: { lt: dayEndsAt.toJSDate() },
          endsAt: { gt: dayStartsAt.toJSDate() },
        }
      : dto.openMinute != null && dto.closeMinute != null
        ? {
            OR: [
              { startsAt: { lt: availabilityStartsAt.toJSDate() } },
              { endsAt: { gt: availabilityEndsAt.toJSDate() } },
            ],
            startsAt: { lt: dayEndsAt.toJSDate() },
            endsAt: { gt: dayStartsAt.toJSDate() },
          }
        : null;
    if (blocksExistingReservations) {
      const [bookingCount, holdCount] = await Promise.all([
        this.prisma.booking.count({
          where: {
            status: {
              notIn: ['ADMIN_REJECTED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'],
            },
            ...blocksExistingReservations,
          },
        }),
        this.prisma.bookingHold.count({
          where: {
            status: 'ACTIVE',
            expiresAt: { gt: new Date() },
            ...blocksExistingReservations,
          },
        }),
      ]);
      if (bookingCount || holdCount) {
        throw new ConflictException({
          code: 'SCHEDULE_OVERRIDE_HAS_BOOKING',
          message:
            'این تغییر با رزرو یا مهلت پرداخت فعال همان روز تداخل دارد؛ ابتدا وضعیت آن را تعیین کنید.',
        });
      }
    }
    const localDate = new Date(`${dto.localDate.slice(0, 10)}T00:00:00.000Z`);
    const result = await this.prisma.bookingScheduleOverride.upsert({
      where: { localDate },
      update: {
        isClosed: dto.isClosed,
        openMinute: dto.isClosed ? null : dto.openMinute,
        closeMinute: dto.isClosed ? null : dto.closeMinute,
        capacity: dto.capacity,
        note: dto.note?.trim() || null,
      },
      create: {
        localDate,
        isClosed: dto.isClosed,
        openMinute: dto.isClosed ? null : dto.openMinute,
        closeMinute: dto.isClosed ? null : dto.closeMinute,
        capacity: dto.capacity,
        note: dto.note?.trim() || null,
      },
    });
    await this.audit(
      adminId,
      'SCHEDULE_OVERRIDE_SAVED',
      'BookingScheduleOverride',
      result.id,
      {
        localDate: dto.localDate,
        isClosed: dto.isClosed,
      },
    );
    return result;
  }

  async deleteScheduleOverride(adminId: string, id: string) {
    const result = await this.prisma.bookingScheduleOverride.delete({
      where: { id },
    });
    await this.audit(
      adminId,
      'SCHEDULE_OVERRIDE_REMOVED',
      'BookingScheduleOverride',
      id,
      {
        localDate: result.localDate.toISOString(),
      },
    );
    return result;
  }

  async saveScheduleTimeBlock(adminId: string, dto: ScheduleTimeBlockDto) {
    if (
      dto.endMinute <= dto.startMinute ||
      dto.startMinute % 30 !== 0 ||
      dto.endMinute % 30 !== 0
    ) {
      throw new BadRequestException({
        code: 'SCHEDULE_TIME_BLOCK_INVALID',
        message: 'شروع و پایان محدودیت باید بازه‌های نیم‌ساعته معتبر باشند.',
      });
    }
    const timezone =
      this.config.get<string>('BUSINESS_TIMEZONE') ?? 'Asia/Tehran';
    const localDay = DateTime.fromISO(dto.localDate.slice(0, 10), {
      zone: timezone,
    }).startOf('day');
    if (!localDay.isValid) {
      throw new BadRequestException({
        code: 'SCHEDULE_TIME_BLOCK_DATE_INVALID',
        message: 'تاریخ انتخاب‌شده معتبر نیست.',
      });
    }
    const blockStartsAt = localDay.plus({ minutes: dto.startMinute }).toUTC();
    const blockEndsAt = localDay.plus({ minutes: dto.endMinute }).toUTC();
    const [bookingsInRange, holdsInRange] = await Promise.all([
      this.prisma.booking.count({
        where: {
          status: {
            notIn: ['ADMIN_REJECTED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'],
          },
          startsAt: { lt: blockEndsAt.toJSDate() },
          endsAt: { gt: blockStartsAt.toJSDate() },
        },
      }),
      this.prisma.bookingHold.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
          startsAt: { lt: blockEndsAt.toJSDate() },
          endsAt: { gt: blockStartsAt.toJSDate() },
        },
      }),
    ]);
    if (bookingsInRange || holdsInRange) {
      throw new ConflictException({
        code: 'SCHEDULE_TIME_BLOCK_HAS_BOOKING',
        message:
          'در این بازه رزرو یا مهلت پرداخت فعال وجود دارد؛ ابتدا وضعیت آن را تعیین کنید.',
      });
    }
    const localDate = new Date(`${dto.localDate.slice(0, 10)}T00:00:00.000Z`);
    const result = await this.prisma.bookingScheduleTimeBlock.upsert({
      where: {
        localDate_startMinute_endMinute: {
          localDate,
          startMinute: dto.startMinute,
          endMinute: dto.endMinute,
        },
      },
      update: {
        reason: dto.reason.trim(),
        createdByAdminId: adminId,
      },
      create: {
        localDate,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        reason: dto.reason.trim(),
        createdByAdminId: adminId,
      },
    });
    await this.audit(
      adminId,
      'SCHEDULE_TIME_BLOCK_SAVED',
      'BookingScheduleTimeBlock',
      result.id,
      {
        localDate: dto.localDate,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
      },
    );
    return result;
  }

  async deleteScheduleTimeBlock(adminId: string, id: string) {
    const result = await this.prisma.bookingScheduleTimeBlock.delete({
      where: { id },
    });
    await this.audit(
      adminId,
      'SCHEDULE_TIME_BLOCK_REMOVED',
      'BookingScheduleTimeBlock',
      id,
      {
        localDate: result.localDate.toISOString(),
        startMinute: result.startMinute,
        endMinute: result.endMinute,
      },
    );
    return result;
  }

  async replySupportTicket(
    adminId: string,
    ticketId: string,
    body: unknown,
    close = false,
  ) {
    if (typeof body !== 'string' || body.trim().length < 2) {
      throw new BadRequestException({
        code: 'SUPPORT_REPLY_REQUIRED',
        message: 'متن پاسخ پشتیبانی الزامی است.',
      });
    }
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket)
      throw new NotFoundException({
        code: 'TICKET_NOT_FOUND',
        message: 'درخواست پشتیبانی پیدا نشد.',
      });
    const result = await this.prisma.$transaction(async (tx) => {
      const message = await tx.supportMessage.create({
        data: {
          ticketId,
          authorType: 'ADMIN',
          authorId: adminId,
          body: body.trim(),
        },
      });
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: close ? 'CLOSED' : 'WAITING_CUSTOMER',
          closedAt: close ? new Date() : null,
        },
      });
      await tx.notification.create({
        data: {
          customerId: ticket.customerId,
          recipient: ticket.customerId,
          channel: 'IN_APP',
          templateCode: 'SUPPORT_REPLY',
          title: 'پاسخ پشتیبانی BestWash',
          body: body.trim().slice(0, 240),
          actionUrl: '/support',
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      return message;
    });
    await this.audit(
      adminId,
      'SUPPORT_TICKET_REPLIED',
      'SupportTicket',
      ticketId,
      { close },
    );
    return result;
  }

  async broadcastMessage(adminId: string, body: unknown, tierCode?: unknown) {
    if (
      typeof body !== 'string' ||
      body.trim().length < 3 ||
      body.trim().length > 300
    ) {
      throw new BadRequestException({
        code: 'MESSAGE_BODY_INVALID',
        message: 'متن پیام باید بین ۳ تا ۳۰۰ نویسه باشد.',
      });
    }
    const customers = await this.prisma.customer.findMany({
      where:
        typeof tierCode === 'string' && tierCode
          ? { loyalty: { tier: { code: tierCode } } }
          : {},
      select: { id: true, mobile: true },
      take: 5000,
    });
    await this.prisma.$transaction(
      customers.map((customer) =>
        this.prisma.outboxEvent.create({
          data: {
            aggregateType: 'customer',
            aggregateId: customer.id,
            eventType: 'admin.broadcast',
            idempotencyKey: `admin.broadcast:${adminId}:${Date.now()}:${customer.id}`,
            payload: {
              customerId: customer.id,
              mobile: customer.mobile,
              templateCode: 'ADMIN_BROADCAST',
              body: body.trim(),
            },
          },
        }),
      ),
    );
    await this.audit(
      adminId,
      'ADMIN_BROADCAST_CREATED',
      'CustomerSegment',
      typeof tierCode === 'string' && tierCode ? tierCode : 'ALL',
      { recipientCount: customers.length },
    );
    return { recipientCount: customers.length };
  }

  content() {
    return Promise.all([
      this.prisma.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.promoBanner.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.businessContent.findMany({ orderBy: { key: 'asc' } }),
    ]).then(([hero, promo, business]) => ({ hero, promo, business }));
  }

  private mediaDirectory() {
    return resolve(process.cwd(), 'uploads', 'media');
  }

  async resolveMediaFile(fileName: string) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{5,180}$/.test(fileName)) {
      throw new NotFoundException('فایل رسانه پیدا نشد.');
    }
    const absolutePath = resolve(this.mediaDirectory(), fileName);
    if (!absolutePath.startsWith(this.mediaDirectory())) {
      throw new NotFoundException('فایل رسانه پیدا نشد.');
    }
    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundException('فایل رسانه پیدا نشد.');
    }
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeType =
      extension === 'png'
        ? 'image/png'
        : extension === 'jpg' || extension === 'jpeg'
          ? 'image/jpeg'
          : extension === 'gif'
            ? 'image/gif'
            : 'image/webp';
    return { absolutePath, mimeType };
  }

  async uploadMedia(adminId: string, dto: MediaUploadDto) {
    const match = dto.dataUrl.match(
      /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/,
    );
    if (!match) {
      throw new BadRequestException({
        code: 'MEDIA_FORMAT_INVALID',
        message: 'فرمت تصویر معتبر نیست.',
      });
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length < 32 || buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException({
        code: 'MEDIA_SIZE_INVALID',
        message: 'حجم تصویر باید کمتر از ۵ مگابایت باشد.',
      });
    }
    const hasValidSignature =
      (match[1] === 'png' &&
        buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) ||
      (match[1] === 'jpeg' &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff) ||
      (match[1] === 'gif' &&
        ['GIF87a', 'GIF89a'].includes(
          buffer.subarray(0, 6).toString('ascii'),
        )) ||
      (match[1] === 'webp' &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP');
    if (!hasValidSignature) {
      throw new BadRequestException({
        code: 'MEDIA_SIGNATURE_INVALID',
        message: 'محتوای فایل با فرمت تصویر انتخاب‌شده مطابقت ندارد.',
      });
    }
    const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
    const normalizedBase =
      dto.fileName
        .replace(/\.[^.]+$/, '')
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'bestwash-media';
    const storedName = `${Date.now()}-${randomBytes(6).toString('hex')}-${normalizedBase}.${extension}`;
    await mkdir(this.mediaDirectory(), { recursive: true });
    await writeFile(resolve(this.mediaDirectory(), storedName), buffer, {
      flag: 'wx',
    });
    const publicBase =
      this.config.get<string>('API_PUBLIC_URL') ??
      `http://localhost:${this.config.get<string>('PORT') ?? '3001'}`;
    const url = `${publicBase.replace(/\/$/, '')}/api/v1/media/files/${storedName}`;
    const asset = await this.prisma.mediaAsset.create({
      data: {
        fileName: storedName,
        url,
        mimeType: `image/${match[1]}`,
        sizeBytes: buffer.length,
        altText: dto.altText.trim(),
        title: dto.title?.trim() || dto.altText.trim(),
        uploadedByAdminId: adminId,
      },
    });
    await this.audit(adminId, 'MEDIA_UPLOADED', 'MediaAsset', asset.id, {
      fileName: storedName,
      sizeBytes: buffer.length,
    });
    return asset;
  }

  async saveHero(adminId: string, data: Record<string, unknown>, id?: string) {
    const text = (value: unknown, fallback = '') =>
      typeof value === 'string' ? value : fallback;
    const normalized = {
      imageUrl: text(data.imageUrl),
      altText: text(data.altText),
      linkType: text(data.linkType, 'NONE'),
      linkValue: text(data.linkValue) || null,
      sortOrder: Number(data.sortOrder ?? 0),
      isActive: data.isActive !== false,
    };
    if (
      !/^\/images\/|^https?:\/\//.test(normalized.imageUrl) ||
      !normalized.altText
    ) {
      throw new BadRequestException(
        'نشانی تصویر و متن جایگزین معتبر الزامی است.',
      );
    }
    const result = id
      ? await this.prisma.heroSlide.update({ where: { id }, data: normalized })
      : await this.prisma.heroSlide.create({ data: normalized });
    await this.audit(adminId, 'HERO_SAVED', 'HeroSlide', result.id, result);
    return result;
  }

  async savePromo(adminId: string, data: Record<string, unknown>, id?: string) {
    const text = (value: unknown, fallback = '') =>
      typeof value === 'string' ? value : fallback;
    const normalized = {
      imageUrl: text(data.imageUrl),
      altText: text(data.altText),
      linkType: text(data.linkType, 'NONE'),
      linkValue: text(data.linkValue) || null,
      isActive: data.isActive !== false,
    };
    if (
      !/^\/images\/|^https?:\/\//.test(normalized.imageUrl) ||
      !normalized.altText
    ) {
      throw new BadRequestException(
        'نشانی تصویر و متن جایگزین معتبر الزامی است.',
      );
    }
    const result = id
      ? await this.prisma.promoBanner.update({
          where: { id },
          data: normalized,
        })
      : await this.prisma.promoBanner.create({ data: normalized });
    await this.audit(adminId, 'PROMO_SAVED', 'PromoBanner', result.id, result);
    return result;
  }

  async removeContent(adminId: string, type: 'hero' | 'promo', id: string) {
    const result =
      type === 'hero'
        ? await this.prisma.heroSlide.delete({ where: { id } })
        : await this.prisma.promoBanner.delete({ where: { id } });
    await this.audit(
      adminId,
      'CONTENT_REMOVED',
      type === 'hero' ? 'HeroSlide' : 'PromoBanner',
      id,
      { type },
    );
    return result;
  }

  async saveBusinessContent(
    adminId: string,
    key: string,
    value: unknown,
    isPublic = true,
  ) {
    const result = await this.prisma.businessContent.upsert({
      where: { key },
      update: {
        value: value as Prisma.InputJsonValue,
        isPublic,
        updatedByAdminId: adminId,
      },
      create: {
        key,
        value: value as Prisma.InputJsonValue,
        isPublic,
        updatedByAdminId: adminId,
      },
    });
    await this.audit(
      adminId,
      'BUSINESS_CONTENT_SAVED',
      'BusinessContent',
      result.id,
      { key },
    );
    return result;
  }

  catalog(entity: string) {
    switch (entity) {
      case 'vehicle-classes':
        return this.prisma.vehicleClass.findMany({
          orderBy: { sortOrder: 'asc' },
        });
      case 'vehicle-brands':
        return this.prisma.vehicleBrand.findMany({
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { models: true } } },
        });
      case 'vehicle-models':
        return this.prisma.vehicleModel.findMany({
          orderBy: { sortOrder: 'asc' },
          include: { brand: true, vehicleClass: true },
        });
      case 'services':
        return this.prisma.service.findMany({
          orderBy: { sortOrder: 'asc' },
          include: { category: true },
        });
      case 'packages':
        return this.prisma.servicePackage.findMany({
          orderBy: { sortOrder: 'asc' },
          include: { prices: true, items: true },
        });
      case 'addons':
        return this.prisma.serviceAddon.findMany({
          orderBy: { sortOrder: 'asc' },
          include: { prices: true },
        });
      case 'loyalty-tiers':
        return this.prisma.loyaltyTier.findMany({
          orderBy: { sortOrder: 'asc' },
        });
      case 'loyalty-rules':
        return this.prisma.loyaltyRule.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'sms-templates':
        return this.prisma.notificationTemplate.findMany({
          orderBy: { code: 'asc' },
        });
      case 'automations':
        return this.prisma.automationRule.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'coupons':
        return this.prisma.coupon.findMany({
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { usages: true } } },
        });
      case 'blog-posts':
        return this.prisma.blogPost.findMany({
          orderBy: { updatedAt: 'desc' },
        });
      case 'media-assets':
        return this.prisma.mediaAsset.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'support-tickets':
        return this.prisma.supportTicket.findMany({
          orderBy: { updatedAt: 'desc' },
          include: {
            customer: {
              select: { mobile: true, firstName: true, lastName: true },
            },
            messages: { orderBy: { createdAt: 'asc' } },
          },
        });
      case 'business-settings':
        return this.prisma.businessSetting.findMany({
          where: { key: { notIn: [...protectedBusinessSettingKeys] } },
          orderBy: { key: 'asc' },
        });
      case 'messages':
        return this.prisma.notification.findMany({
          where: { channel: 'SMS' },
          orderBy: { createdAt: 'desc' },
          take: 300,
        });
      default:
        throw new NotFoundException('Catalog entity not found.');
    }
  }

  async mutateCatalog(
    adminId: string,
    entity: string,
    data: Record<string, unknown>,
    id?: string,
  ) {
    const result = await this.mutateCatalogData(entity, data, id);
    await this.audit(
      adminId,
      id ? 'CATALOG_ITEM_UPDATED' : 'CATALOG_ITEM_CREATED',
      entity,
      String((result as { id?: string }).id ?? id ?? ''),
      { entity, itemId: (result as { id?: string }).id ?? id ?? null },
    );
    return result;
  }

  private async mutateCatalogData(
    entity: string,
    data: Record<string, unknown>,
    id?: string,
  ) {
    const payload = data as never;
    switch (entity) {
      case 'vehicle-classes':
        return id
          ? this.prisma.vehicleClass.update({ where: { id }, data: payload })
          : this.prisma.vehicleClass.create({ data: payload });
      case 'vehicle-brands':
        return id
          ? this.prisma.vehicleBrand.update({ where: { id }, data: payload })
          : this.prisma.vehicleBrand.create({ data: payload });
      case 'vehicle-models':
        return id
          ? this.prisma.vehicleModel.update({ where: { id }, data: payload })
          : this.prisma.vehicleModel.create({ data: payload });
      case 'services':
        return id
          ? this.prisma.service.update({ where: { id }, data: payload })
          : this.prisma.service.create({ data: payload });
      case 'packages': {
        const { serviceIds, priceRows, ...packageData } = data;
        const selectedServices = Array.isArray(serviceIds)
          ? serviceIds.filter(
              (value): value is string => typeof value === 'string',
            )
          : [];
        const prices = Array.isArray(priceRows)
          ? priceRows.filter(
              (row): row is { vehicleClassId: string; amountRial: number } =>
                Boolean(
                  row &&
                  typeof row === 'object' &&
                  typeof (row as Record<string, unknown>).vehicleClassId ===
                    'string' &&
                  Number.isInteger(
                    Number((row as Record<string, unknown>).amountRial),
                  ) &&
                  Number((row as Record<string, unknown>).amountRial) >= 0,
                ),
            )
          : [];
        return this.prisma.$transaction(async (tx) => {
          const saved = id
            ? await tx.servicePackage.update({
                where: { id },
                data: packageData as never,
              })
            : await tx.servicePackage.create({ data: packageData as never });
          await tx.servicePackageItem.deleteMany({
            where: { packageId: saved.id },
          });
          await tx.servicePackagePrice.deleteMany({
            where: { packageId: saved.id },
          });
          if (selectedServices.length) {
            await tx.servicePackageItem.createMany({
              data: selectedServices.map((serviceId, sortOrder) => ({
                packageId: saved.id,
                serviceId,
                sortOrder,
              })),
              skipDuplicates: true,
            });
          }
          if (prices.length) {
            await tx.servicePackagePrice.createMany({
              data: prices.map((row) => ({
                packageId: saved.id,
                vehicleClassId: row.vehicleClassId,
                amountRial: Number(row.amountRial),
              })),
              skipDuplicates: true,
            });
          }
          return tx.servicePackage.findUnique({
            where: { id: saved.id },
            include: { items: true, prices: true },
          });
        });
      }
      case 'addons': {
        const { priceRows, ...addonData } = data;
        const prices = Array.isArray(priceRows)
          ? priceRows.filter(
              (row): row is { vehicleClassId: string; amountRial: number } =>
                Boolean(
                  row &&
                  typeof row === 'object' &&
                  typeof (row as Record<string, unknown>).vehicleClassId ===
                    'string' &&
                  Number.isInteger(
                    Number((row as Record<string, unknown>).amountRial),
                  ) &&
                  Number((row as Record<string, unknown>).amountRial) >= 0,
                ),
            )
          : [];
        return this.prisma.$transaction(async (tx) => {
          const saved = id
            ? await tx.serviceAddon.update({
                where: { id },
                data: addonData as never,
              })
            : await tx.serviceAddon.create({ data: addonData as never });
          await tx.serviceAddonPrice.deleteMany({
            where: { addonId: saved.id },
          });
          if (prices.length) {
            await tx.serviceAddonPrice.createMany({
              data: prices.map((row) => ({
                addonId: saved.id,
                vehicleClassId: row.vehicleClassId,
                amountRial: Number(row.amountRial),
              })),
              skipDuplicates: true,
            });
          }
          return tx.serviceAddon.findUnique({
            where: { id: saved.id },
            include: { prices: true },
          });
        });
      }
      case 'loyalty-tiers':
        return id
          ? this.prisma.loyaltyTier.update({ where: { id }, data: payload })
          : this.prisma.loyaltyTier.create({ data: payload });
      case 'loyalty-rules':
        return id
          ? this.prisma.loyaltyRule.update({ where: { id }, data: payload })
          : this.prisma.loyaltyRule.create({ data: payload });
      case 'sms-templates':
        return id
          ? this.prisma.notificationTemplate.update({
              where: { id },
              data: payload,
            })
          : this.prisma.notificationTemplate.create({ data: payload });
      case 'automations':
        return id
          ? this.prisma.automationRule.update({ where: { id }, data: payload })
          : this.prisma.automationRule.create({ data: payload });
      case 'coupons': {
        const text = (value: unknown) =>
          typeof value === 'string' ? value : '';
        const code = text(data.code).trim().toUpperCase();
        const type = text(data.type);
        const value = Number(data.value);
        const perCustomerUsage = Number(data.perCustomerUsage ?? 1);
        const minimumAmountRial = Number(data.minimumAmountRial ?? 0);
        const minimumPriorBookings = Number(data.minimumPriorBookings ?? 0);
        const minimumPoints = Number(data.minimumPoints ?? 0);
        const maxUsage =
          data.maxUsage == null || data.maxUsage === ''
            ? null
            : Number(data.maxUsage);
        const startsAt = text(data.startsAt)
          ? new Date(text(data.startsAt))
          : null;
        const endsAt = text(data.endsAt) ? new Date(text(data.endsAt)) : null;
        const eligibleTierCodes = Array.isArray(data.eligibleTierCodes)
          ? data.eligibleTierCodes.filter(
              (item): item is string => typeof item === 'string' && !!item,
            )
          : [];
        const deliveryChannels = Array.isArray(data.deliveryChannels)
          ? [...new Set(data.deliveryChannels.map(String))]
          : [];
        const displayPlacement = text(data.displayPlacement) || null;
        const promotionFrequency = text(data.promotionFrequency) || 'ONCE';
        if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
          throw new BadRequestException({
            code: 'COUPON_CODE_INVALID',
            message:
              'کد تخفیف باید ۳ تا ۳۲ نویسه و شامل حروف انگلیسی، عدد، خط تیره یا زیرخط باشد.',
          });
        }
        if (!['PERCENTAGE', 'FIXED'].includes(type)) {
          throw new BadRequestException({
            code: 'COUPON_TYPE_INVALID',
            message: 'نوع تخفیف معتبر نیست.',
          });
        }
        if (
          !Number.isInteger(value) ||
          value <= 0 ||
          (type === 'PERCENTAGE' && value > 100)
        ) {
          throw new BadRequestException({
            code: 'COUPON_VALUE_INVALID',
            message:
              type === 'PERCENTAGE'
                ? 'درصد تخفیف باید عددی بین ۱ تا ۱۰۰ باشد.'
                : 'مبلغ تخفیف باید یک عدد صحیح مثبت باشد.',
          });
        }
        if (
          !Number.isInteger(perCustomerUsage) ||
          perCustomerUsage < 1 ||
          !Number.isInteger(minimumAmountRial) ||
          minimumAmountRial < 0 ||
          !Number.isInteger(minimumPriorBookings) ||
          minimumPriorBookings < 0 ||
          !Number.isInteger(minimumPoints) ||
          minimumPoints < 0 ||
          (maxUsage != null && (!Number.isInteger(maxUsage) || maxUsage < 1))
        ) {
          throw new BadRequestException({
            code: 'COUPON_LIMIT_INVALID',
            message: 'محدودیت‌های مصرف و شرایط کمپین معتبر نیستند.',
          });
        }
        if (
          (startsAt && Number.isNaN(startsAt.getTime())) ||
          (endsAt && Number.isNaN(endsAt.getTime())) ||
          (startsAt && endsAt && endsAt <= startsAt)
        ) {
          throw new BadRequestException({
            code: 'COUPON_DATE_INVALID',
            message: 'زمان پایان اعتبار باید پس از زمان شروع باشد.',
          });
        }
        if (data.firstBookingOnly === true && minimumPriorBookings > 0) {
          throw new BadRequestException({
            code: 'COUPON_AUDIENCE_CONFLICT',
            message:
              'کمپین اولین رزرو نمی‌تواند هم‌زمان به رزرو قبلی نیاز داشته باشد.',
          });
        }
        if (
          deliveryChannels.some(
            (channel) => !['IN_APP', 'SMS', 'PUSH'].includes(channel),
          ) ||
          (displayPlacement &&
            !['PAYMENT_SUCCESS', 'HOME', 'BOOKING', 'NOTIFICATIONS'].includes(
              displayPlacement,
            )) ||
          !['ONCE', 'EVERY_ELIGIBLE_PAYMENT'].includes(promotionFrequency)
        ) {
          throw new BadRequestException({
            code: 'COUPON_DELIVERY_INVALID',
            message: 'روش اطلاع‌رسانی یا محل نمایش کمپین معتبر نیست.',
          });
        }
        if (eligibleTierCodes.length) {
          const validTierCount = await this.prisma.loyaltyTier.count({
            where: { code: { in: eligibleTierCodes }, isActive: true },
          });
          if (validTierCount !== new Set(eligibleTierCodes).size) {
            throw new BadRequestException({
              code: 'COUPON_TIER_INVALID',
              message: 'یکی از سطح‌های انتخاب‌شده باشگاه معتبر یا فعال نیست.',
            });
          }
        }
        const normalized = {
          code,
          type,
          value,
          startsAt,
          endsAt,
          maxUsage,
          perCustomerUsage,
          minimumAmountRial,
          firstBookingOnly: data.firstBookingOnly === true,
          minimumPriorBookings,
          minimumPoints,
          eligibleTierCodes: [...new Set(eligibleTierCodes)],
          deliveryChannels,
          displayPlacement,
          promotionFrequency,
          isActive: data.isActive !== false,
        };
        return id
          ? this.prisma.coupon.update({ where: { id }, data: normalized })
          : this.prisma.coupon.create({ data: normalized });
      }
      case 'blog-posts':
        return id
          ? this.prisma.blogPost.update({ where: { id }, data: payload })
          : this.prisma.blogPost.create({ data: payload });
      case 'business-settings': {
        const existing = id
          ? await this.prisma.businessSetting.findUnique({
              where: { id },
              select: { key: true },
            })
          : null;
        const requestedKey =
          typeof data.key === 'string' ? data.key.trim() : undefined;
        if (
          (existing?.key && protectedBusinessSettingKeys.has(existing.key)) ||
          (requestedKey && protectedBusinessSettingKeys.has(requestedKey))
        ) {
          throw new ForbiddenException({
            code: 'PROTECTED_SECURITY_SETTING',
            message: 'این تنظیم امنیتی از پنل عمومی قابل تغییر نیست.',
          });
        }
        return id
          ? this.prisma.businessSetting.update({ where: { id }, data: payload })
          : this.prisma.businessSetting.create({ data: payload });
      }
      case 'media-assets':
        return id
          ? this.prisma.mediaAsset.update({ where: { id }, data: payload })
          : this.prisma.mediaAsset.create({ data: payload });
      default:
        throw new NotFoundException('Catalog entity not found.');
    }
  }

  async removeCatalog(adminId: string, entity: string, id: string) {
    const result = await this.removeCatalogData(entity, id);
    await this.audit(
      adminId,
      ['blog-posts', 'media-assets'].includes(entity)
        ? 'CATALOG_ITEM_DELETED'
        : 'CATALOG_ITEM_DEACTIVATED',
      entity,
      id,
      {
        entity,
        itemId: id,
      },
    );
    return result;
  }

  private async removeCatalogData(entity: string, id: string) {
    switch (entity) {
      case 'vehicle-classes':
        return this.prisma.vehicleClass.update({
          where: { id },
          data: { isActive: false },
        });
      case 'vehicle-brands':
        return this.prisma.vehicleBrand.update({
          where: { id },
          data: { isActive: false },
        });
      case 'vehicle-models':
        return this.prisma.vehicleModel.update({
          where: { id },
          data: { isActive: false },
        });
      case 'services':
        return this.prisma.service.update({
          where: { id },
          data: { isActive: false },
        });
      case 'packages':
        return this.prisma.servicePackage.update({
          where: { id },
          data: { isActive: false },
        });
      case 'addons':
        return this.prisma.serviceAddon.update({
          where: { id },
          data: { isActive: false },
        });
      case 'coupons':
        return this.prisma.coupon.update({
          where: { id },
          data: { isActive: false },
        });
      case 'blog-posts':
        return this.prisma.blogPost.delete({ where: { id } });
      case 'media-assets':
        return this.deleteMediaAsset(id);
      default:
        throw new NotFoundException({
          code: 'CATALOG_DELETE_NOT_SUPPORTED',
          message: 'حذف این نوع داده پشتیبانی نمی‌شود.',
        });
    }
  }

  async permanentlyDeleteCatalog(adminId: string, entity: string, id: string) {
    try {
      const result = await this.deleteCatalogData(entity, id);
      await this.audit(adminId, 'CATALOG_ITEM_DELETED', entity, id, {
        entity,
        itemId: id,
      });
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        code: 'CATALOG_ITEM_IN_USE',
        message:
          'این مورد در اطلاعات قبلی استفاده شده و حذف دائمی آن امن نیست؛ می‌توانید آن را غیرفعال کنید.',
      });
    }
  }

  private deleteCatalogData(entity: string, id: string) {
    switch (entity) {
      case 'vehicle-classes':
        return this.prisma.vehicleClass.delete({ where: { id } });
      case 'vehicle-brands':
        return this.prisma.vehicleBrand.delete({ where: { id } });
      case 'vehicle-models':
        return this.prisma.vehicleModel.delete({ where: { id } });
      case 'services':
        return this.prisma.service.delete({ where: { id } });
      case 'packages':
        return this.prisma.servicePackage.delete({ where: { id } });
      case 'addons':
        return this.prisma.serviceAddon.delete({ where: { id } });
      case 'loyalty-tiers':
        return this.prisma.loyaltyTier.delete({ where: { id } });
      case 'loyalty-rules':
        return this.prisma.loyaltyRule.delete({ where: { id } });
      case 'sms-templates':
        return this.prisma.notificationTemplate.delete({ where: { id } });
      case 'automations':
        return this.prisma.automationRule.delete({ where: { id } });
      case 'coupons':
        return this.prisma.coupon.delete({ where: { id } });
      case 'blog-posts':
        return this.prisma.blogPost.delete({ where: { id } });
      case 'media-assets':
        return this.deleteMediaAsset(id);
      default:
        throw new NotFoundException({
          code: 'CATALOG_DELETE_NOT_SUPPORTED',
          message: 'حذف دائمی برای این بخش پشتیبانی نمی‌شود.',
        });
    }
  }

  private async deleteMediaAsset(id: string) {
    const media = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'رسانه پیدا نشد.',
      });
    }
    const result = await this.prisma.mediaAsset.delete({ where: { id } });
    try {
      await unlink(resolve(this.mediaDirectory(), media.fileName));
    } catch {
      // The database is the source of truth; a missing legacy file is harmless.
    }
    return result;
  }

  logs(range?: string) {
    const hoursByRange: Record<string, number> = {
      '24h': 24,
      '3d': 72,
      '7d': 168,
      '30d': 720,
    };
    const selectedRange = hoursByRange[range ?? '24h']
      ? (range ?? '24h')
      : '24h';
    const since = new Date(
      Date.now() - hoursByRange[selectedRange] * 3_600_000,
    );
    return Promise.all([
      this.prisma.auditLog.findMany({
        where: { actorType: 'ADMIN', createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.auditLog.findMany({
        where: { actorType: { not: 'ADMIN' }, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.securityEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    ]).then(([admin, application, security]) => ({
      range: selectedRange,
      since,
      admin,
      application,
      security,
    }));
  }

  private audit(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    after: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: adminId,
        action,
        entityType,
        entityId,
        after,
      },
    });
  }
}
