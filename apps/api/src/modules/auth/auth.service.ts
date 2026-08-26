import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import {
  createCipheriv,
  createHash,
  randomBytes,
  randomInt,
} from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { normalizeIranianMobile } from './mobile';

interface SessionContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  private sha(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private otpHash(mobile: string, purpose: string, code: string): string {
    const pepper =
      this.config.get<string>('OTP_PEPPER') ?? 'development-only-pepper';
    return this.sha(`${mobile}:${purpose}:${code}:${pepper}`);
  }

  private encryptMessageSecret(value: string): string {
    const key = createHash('sha256')
      .update(
        this.config.get<string>('MESSAGE_SECRET_ENCRYPTION_KEY') ??
          'development-message-key-change-me',
      )
      .digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  async requestOtp(
    rawMobile: string,
    purpose: string,
    context: SessionContext,
  ) {
    const mobile = normalizeIranianMobile(rawMobile);
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recent = await this.prisma.otpChallenge.count({
      where: { mobile, purpose, createdAt: { gte: oneMinuteAgo } },
    });
    if (recent >= 1) {
      throw new HttpException(
        {
          code: 'OTP_RATE_LIMITED',
          message: 'برای ارسال دوباره کد کمی صبر کنید.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(100000, 1_000_000));
    const expiresAt = new Date(Date.now() + 2 * 60_000);
    const customer = await this.prisma.customer.findUnique({
      where: { mobile },
    });

    await this.prisma.$transaction([
      this.prisma.otpChallenge.create({
        data: {
          mobile,
          purpose,
          codeHash: this.otpHash(mobile, purpose, code),
          expiresAt,
          ipAddress: context.ipAddress,
          customerId: customer?.id,
        },
      }),
      this.prisma.outboxEvent.create({
        data: {
          aggregateType: 'customer',
          aggregateId: customer?.id ?? mobile,
          eventType: 'notification.otp.requested',
          idempotencyKey: `otp:${mobile}:${purpose}:${Date.now()}`,
          payload: {
            mobile,
            purpose,
            secretCiphertext: this.encryptMessageSecret(code),
            templateCode: 'AUTH_OTP',
          },
        },
      }),
    ]);

    const expose =
      this.config.get<string>('EXPOSE_TEST_OTP') === 'true' &&
      this.config.get<string>('NODE_ENV') !== 'production';
    return {
      mobile,
      expiresAt,
      resendAfterSeconds: 60,
      ...(expose ? { developmentCode: code } : {}),
    };
  }

  async verifyOtp(
    rawMobile: string,
    purpose: string,
    code: string,
    context: SessionContext,
  ) {
    const mobile = normalizeIranianMobile(rawMobile);
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { mobile, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || challenge.expiresAt <= new Date()) {
      throw new UnauthorizedException({
        code: 'OTP_EXPIRED',
        message: 'کد منقضی شده است؛ کد جدید دریافت کنید.',
      });
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new HttpException(
        {
          code: 'OTP_LOCKED',
          message: 'تعداد تلاش بیش از حد مجاز است.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (this.otpHash(mobile, purpose, code) !== challenge.codeHash) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      await this.prisma.securityEvent.create({
        data: {
          eventType: 'OTP_VERIFY_FAILED',
          severity: 'WARN',
          ipAddress: context.ipAddress,
          metadata: {
            mobile: `${mobile.slice(0, 5)}***${mobile.slice(-3)}`,
            purpose,
          },
        },
      });
      throw new UnauthorizedException({
        code: 'OTP_INVALID',
        message: 'کد واردشده صحیح نیست.',
      });
    }

    const consumed = await this.prisma.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new ConflictException({
        code: 'OTP_REPLAYED',
        message: 'این کد قبلاً استفاده شده است.',
      });
    }

    const customer = await this.prisma.customer.upsert({
      where: { mobile },
      update: { mobileVerifiedAt: new Date(), lastLoginAt: new Date() },
      create: { mobile, mobileVerifiedAt: new Date(), lastLoginAt: new Date() },
    });
    await this.prisma.walletAccount.upsert({
      where: { customerId: customer.id },
      update: {},
      create: { customerId: customer.id },
    });
    await this.prisma.loyaltyAccount.upsert({
      where: { customerId: customer.id },
      update: {},
      create: { customerId: customer.id },
    });

    return this.createSession(customer.id, context);
  }

  private async createSession(customerId: string, context: SessionContext) {
    const secret =
      this.config.get<string>('JWT_ACCESS_SECRET') ??
      'development-access-secret-change-me';
    const provisional = await this.prisma.customerSession.create({
      data: {
        customerId,
        tokenHash: this.sha(`${customerId}:${Date.now()}:${Math.random()}`),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
      },
    });
    const token = await this.jwt.signAsync(
      { sub: customerId, sid: provisional.id, type: 'customer' },
      { secret, expiresIn: 30 * 24 * 60 * 60 },
    );
    await this.prisma.customerSession.update({
      where: { id: provisional.id },
      data: { tokenHash: this.sha(token) },
    });
    return { token, customer: await this.profile(customerId) };
  }

  async passwordLogin(
    rawMobile: string,
    password: string,
    context: SessionContext,
  ) {
    const mobile = normalizeIranianMobile(rawMobile);
    const customer = await this.prisma.customer.findUnique({
      where: { mobile },
    });
    if (
      !customer?.passwordHash ||
      !(await compare(password, customer.passwordHash))
    ) {
      throw new UnauthorizedException({
        code: 'LOGIN_INVALID',
        message: 'شماره موبایل یا رمز عبور صحیح نیست.',
      });
    }
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });
    return this.createSession(customer.id, context);
  }

  async validateToken(token: string) {
    const secret =
      this.config.get<string>('JWT_ACCESS_SECRET') ??
      'development-access-secret-change-me';
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        sid: string;
        type: string;
      }>(token, { secret });
      if (payload.type !== 'customer') throw new Error('wrong token type');
      const session = await this.prisma.customerSession.findUnique({
        where: { id: payload.sid },
      });
      if (
        !session ||
        session.customerId !== payload.sub ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        session.tokenHash !== this.sha(token)
      ) {
        throw new Error('session invalid');
      }
      return { customerId: payload.sub, sessionId: payload.sid };
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'برای ادامه وارد حساب شوید.',
      });
    }
  }

  async session(token: string) {
    if (!token) return { authenticated: false as const };

    try {
      const authenticated = await this.validateToken(token);
      return {
        authenticated: true as const,
        customer: await this.profile(authenticated.customerId),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return { authenticated: false as const };
      }
      throw error;
    }
  }

  async setPassword(customerId: string, password: string) {
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { passwordHash: await hash(password, 12) },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: 'CUSTOMER',
          actorId: customerId,
          action: 'CUSTOMER_PASSWORD_SET',
          entityType: 'Customer',
          entityId: customerId,
          after: { passwordConfigured: true },
        },
      }),
      this.prisma.securityEvent.create({
        data: {
          eventType: 'CUSTOMER_PASSWORD_CHANGED',
          actorType: 'CUSTOMER',
          actorId: customerId,
        },
      }),
    ]);
    return { success: true };
  }

  async logout(sessionId: string) {
    await this.prisma.customerSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(customerId: string) {
    await this.prisma.customerSession.updateMany({
      where: { customerId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async profile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        mobile: true,
        firstName: true,
        lastName: true,
        email: true,
        birthDate: true,
        marketingConsent: true,
        notificationPreferences: true,
        passwordHash: true,
        mobileVerifiedAt: true,
        createdAt: true,
        wallet: { select: { balanceRial: true } },
        loyalty: {
          select: {
            points: true,
            tier: { select: { code: true, nameFa: true } },
          },
        },
      },
    });
    if (!customer) throw new BadRequestException('Customer not found.');
    return {
      ...customer,
      passwordConfigured: Boolean(customer.passwordHash),
      passwordHash: undefined,
    };
  }

  async updateProfile(
    customerId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      birthDate?: string;
      marketingConsent?: boolean;
      notificationPreferences?: Record<string, boolean>;
    },
  ) {
    const before = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true, email: true, birthDate: true },
    });
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        email: data.email?.trim().toLowerCase(),
        birthDate: data.birthDate
          ? new Date(`${data.birthDate}T00:00:00Z`)
          : undefined,
        marketingConsent: data.marketingConsent,
        notificationPreferences: data.notificationPreferences,
      },
    });
    const after = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true, email: true, birthDate: true },
    });
    await this.prisma.auditLog.create({
      data: {
        actorType: 'CUSTOMER',
        actorId: customerId,
        action: 'CUSTOMER_PROFILE_UPDATED',
        entityType: 'Customer',
        entityId: customerId,
        before: before
          ? {
              ...before,
              birthDate: before.birthDate?.toISOString() ?? null,
            }
          : undefined,
        after: after
          ? { ...after, birthDate: after.birthDate?.toISOString() ?? null }
          : undefined,
      },
    });
    const wasComplete = Boolean(
      before?.firstName && before.lastName && before.email && before.birthDate,
    );
    const isComplete = Boolean(
      after?.firstName && after.lastName && after.email && after.birthDate,
    );
    if (!wasComplete && isComplete) {
      const account = await this.prisma.loyaltyAccount.upsert({
        where: { customerId },
        update: {},
        create: { customerId },
      });
      const exists = await this.prisma.loyaltyTransaction.findUnique({
        where: { idempotencyKey: `profile:complete:${customerId}` },
      });
      if (!exists) {
        await this.prisma.$transaction([
          this.prisma.loyaltyAccount.update({
            where: { id: account.id },
            data: { points: { increment: 10 } },
          }),
          this.prisma.loyaltyTransaction.create({
            data: {
              accountId: account.id,
              points: 10,
              type: 'PROFILE_COMPLETED',
              idempotencyKey: `profile:complete:${customerId}`,
              description: 'تکمیل اطلاعات پروفایل',
            },
          }),
          this.prisma.notification.create({
            data: {
              customerId,
              templateCode: 'PROFILE_COMPLETED',
              channel: 'IN_APP',
              recipient: customerId,
              title: 'پروفایل شما کامل شد',
              body: '۱۰ امتیاز به‌دلیل تکمیل اطلاعات پروفایل دریافت کردید.',
              actionUrl: '/loyalty',
              status: 'DELIVERED',
              sentAt: new Date(),
              deliveredAt: new Date(),
            },
          }),
        ]);
      }
    }
    return this.profile(customerId);
  }
}
