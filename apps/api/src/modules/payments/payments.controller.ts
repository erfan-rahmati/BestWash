import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CustomerAuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { InitiatePaymentDto, PaymentQuoteDto } from './payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  @Post('quote')
  async quote(
    @Req() request: AuthenticatedRequest,
    @Body() dto: PaymentQuoteDto,
  ) {
    return {
      data: await this.payments.quote(
        request.auth.customerId,
        dto.checkoutToken,
        dto.useWallet ?? false,
        dto.couponCode,
      ),
    };
  }

  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  @Post('initiate')
  async initiate(
    @Req() request: AuthenticatedRequest,
    @Body() dto: InitiatePaymentDto,
    @Headers('idempotency-key') idempotencyKey = '',
  ) {
    return {
      data: await this.payments.initiate(
        request.auth.customerId,
        dto.checkoutToken,
        dto.useWallet ?? false,
        idempotencyKey,
        dto.couponCode,
        {
          mode: dto.pickupMode,
          name: dto.delegateName,
          mobile: dto.delegateMobile,
        },
      ),
    };
  }

  @Get('zibal/callback')
  async zibalCallback(
    @Query('trackId') trackId = '',
    @Query() payload: Record<string, string>,
    @Res() response: Response,
  ) {
    const payment = await this.payments.callback(trackId, payload);
    const web =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    return response.redirect(
      303,
      `${web}/payment/result?status=success&paymentId=${encodeURIComponent(payment.id)}&bookingId=${encodeURIComponent(payment.bookingId ?? '')}`,
    );
  }

  @Get('zarinpal/callback')
  async zarinpalCallback(
    @Query('Authority') authority = '',
    @Query('Status') status = '',
    @Query() payload: Record<string, string>,
    @Res() response: Response,
  ) {
    const web =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    if (status !== 'OK' || !authority) {
      return response.redirect(303, `${web}/payment/result?status=failed`);
    }
    const payment = await this.payments.callback(authority, payload);
    return response.redirect(
      303,
      `${web}/payment/result?status=success&paymentId=${encodeURIComponent(payment.id)}&bookingId=${encodeURIComponent(payment.bookingId ?? '')}`,
    );
  }

  @Post('test/:paymentId/complete')
  async completeTest(@Param('paymentId') paymentId: string) {
    return { data: await this.payments.completeTest(paymentId) };
  }

  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.payments.get(request.auth.customerId, id) };
  }
}
