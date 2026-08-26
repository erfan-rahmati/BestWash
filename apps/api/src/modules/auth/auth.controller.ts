import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CustomerAuthGuard, customerTokenFromRequest } from './auth.guard';
import type { AuthenticatedRequest } from './auth.guard';
import {
  PasswordLoginDto,
  RequestOtpDto,
  SetPasswordDto,
  UpdateProfileDto,
  VerifyOtpDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private context(request: Request) {
    return { ipAddress: request.ip, userAgent: request.header('user-agent') };
  }

  private setCookie(response: Response, token: string): void {
    response.cookie('bw_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60_000,
      path: '/',
    });
  }

  private clearCookie(response: Response): void {
    response.clearCookie('bw_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  @Post('otp/request')
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  async requestOtp(@Body() dto: RequestOtpDto, @Req() request: Request) {
    return {
      data: await this.auth.requestOtp(
        dto.mobile,
        dto.purpose,
        this.context(request),
      ),
    };
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 10, ttl: 10 * 60_000 } })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.verifyOtp(
      dto.mobile,
      dto.purpose,
      dto.code,
      this.context(request),
    );
    this.setCookie(response, result.token);
    return { data: { customer: result.customer } };
  }

  @Post('password/login')
  @Throttle({ default: { limit: 10, ttl: 10 * 60_000 } })
  async passwordLogin(
    @Body() dto: PasswordLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.passwordLogin(
      dto.mobile,
      dto.password,
      this.context(request),
    );
    this.setCookie(response, result.token);
    return { data: { customer: result.customer } };
  }

  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    return { data: await this.auth.profile(request.auth.customerId) };
  }

  @Get('session')
  async session(@Req() request: Request) {
    return {
      data: await this.auth.session(customerTokenFromRequest(request)),
    };
  }

  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  @Put('me')
  async update(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return {
      data: await this.auth.updateProfile(request.auth.customerId, dto),
    };
  }

  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  @Put('password')
  async password(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SetPasswordDto,
  ) {
    return {
      data: await this.auth.setPassword(request.auth.customerId, dto.password),
    };
  }

  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  @Post('logout')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.auth.sessionId);
    this.clearCookie(response);
    return { data: { success: true } };
  }

  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  @Post('logout-all')
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logoutAll(request.auth.customerId);
    this.clearCookie(response);
    return { data: { success: true } };
  }
}
