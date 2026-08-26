import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { TransitionBookingDto, VerifyPickupDto } from '../pickup/pickup.dto';
import {
  AdminLoginDto,
  AdminPushSubscriptionDto,
  AdminPaymentDto,
  CatalogMutationDto,
  ManualBookingDto,
  MediaUploadDto,
  PickupReminderDto,
  ScheduleOverrideDto,
  ScheduleRuleDto,
  ScheduleTimeBlockDto,
  UpdateCustomerTierDto,
} from './admin.dto';
import { AdminGuard, RequirePermission } from './admin.guard';
import type { AdminRequest } from './admin.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin authentication')
@UseGuards(ThrottlerGuard)
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly admins: AdminService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: AdminLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.admins.login(
      dto.username,
      dto.password,
      dto.otpCode,
      dto.challengeId,
      {
        ip: request.ip,
        userAgent: request.header('user-agent'),
      },
    );
    if ('token' in result && result.token) {
      response.cookie('bw_admin_session', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 12 * 60 * 60_000,
        path: '/',
      });
      return { data: { admin: result.admin } };
    }
    return { data: result };
  }
}

@ApiTags('Public media')
@Controller('media')
export class PublicMediaController {
  constructor(private readonly admins: AdminService) {}

  @Get('files/:fileName')
  async mediaFile(
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ) {
    const file = await this.admins.resolveMediaFile(fileName);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return response.sendFile(file.absolutePath);
  }
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admins: AdminService) {}

  @Post('auth/logout')
  async logout(
    @Req() request: AdminRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.admins.logout(request.admin.sessionId);
    response.clearCookie('bw_admin_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return { data: { success: true } };
  }

  @Get('profile')
  async profile(@Req() request: AdminRequest) {
    return { data: await this.admins.profile(request.admin.adminId) };
  }

  @Get('notifications')
  async notifications(@Req() request: AdminRequest) {
    return {
      data: await this.admins.adminNotifications(request.admin.adminId),
    };
  }

  @Patch('notifications/:id/read')
  async readNotification(
    @Req() request: AdminRequest,
    @Param('id') id: string,
  ) {
    return {
      data: await this.admins.readAdminNotification(request.admin.adminId, id),
    };
  }

  @Post('push-subscriptions')
  async pushSubscription(
    @Req() request: AdminRequest,
    @Body() dto: AdminPushSubscriptionDto,
  ) {
    return {
      data: await this.admins.saveAdminPushSubscription(
        request.admin.adminId,
        dto,
        request.header('user-agent'),
      ),
    };
  }

  @RequirePermission('reports.read')
  @Get('dashboard')
  async dashboard() {
    return { data: await this.admins.dashboard() };
  }

  @RequirePermission('bookings.read')
  @Get('bookings')
  async bookings(@Query('source') source?: 'CUSTOMER_APP' | 'ADMIN_MANUAL') {
    return { data: await this.admins.listBookings(source) };
  }

  @RequirePermission('bookings.manage')
  @Post('bookings/manual')
  async manual(@Req() request: AdminRequest, @Body() dto: ManualBookingDto) {
    return { data: await this.admins.createManual(request.admin.adminId, dto) };
  }

  @RequirePermission('payments.manage')
  @Post('bookings/manual/:checkoutToken/payment')
  async manualPayment(
    @Req() request: AdminRequest,
    @Param('checkoutToken') checkoutToken: string,
    @Body() dto: AdminPaymentDto,
  ) {
    return {
      data: await this.admins.payManual(
        request.admin.adminId,
        checkoutToken,
        dto.idempotencyKey,
      ),
    };
  }

  @RequirePermission('bookings.manage')
  @Patch('bookings/:id/status')
  async transition(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: TransitionBookingDto,
  ) {
    return {
      data: await this.admins.transition(
        id,
        dto.status,
        request.admin.adminId,
        dto.reason,
      ),
    };
  }

  @RequirePermission('bookings.deliver')
  @Post('bookings/:id/pickup-reminder')
  async pickupReminder(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: PickupReminderDto,
  ) {
    return {
      data: await this.admins.sendPickupReminder(
        id,
        request.admin.adminId,
        dto.message,
      ),
    };
  }

  @RequirePermission('bookings.deliver')
  @Post('pickup/verify')
  async verifyPickup(
    @Req() request: AdminRequest,
    @Body() dto: VerifyPickupDto,
  ) {
    return {
      data: await this.admins.verifyPickup(
        dto.bookingId,
        dto.code,
        request.admin.adminId,
      ),
    };
  }

  @RequirePermission('payments.read')
  @Get('payments')
  async payments() {
    return { data: await this.admins.listPayments() };
  }

  @RequirePermission('customers.read')
  @Get('customers')
  async customers() {
    return { data: await this.admins.listCustomers() };
  }

  @RequirePermission('customers.manage')
  @Patch('customers/:id/tier')
  async customerTier(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerTierDto,
  ) {
    return {
      data: await this.admins.updateCustomerTier(
        request.admin.adminId,
        id,
        dto.tierId,
      ),
    };
  }

  @RequirePermission('catalog.read')
  @Get('schedule')
  async schedule() {
    return { data: await this.admins.schedule() };
  }

  @RequirePermission('catalog.manage')
  @Put('schedule/rules/:weekday')
  async scheduleRule(
    @Req() request: AdminRequest,
    @Param('weekday') weekday: string,
    @Body() dto: ScheduleRuleDto,
  ) {
    return {
      data: await this.admins.saveScheduleRule(
        request.admin.adminId,
        Number(weekday),
        dto,
      ),
    };
  }

  @RequirePermission('catalog.manage')
  @Post('schedule/overrides')
  async scheduleOverride(
    @Req() request: AdminRequest,
    @Body() dto: ScheduleOverrideDto,
  ) {
    return {
      data: await this.admins.saveScheduleOverride(request.admin.adminId, dto),
    };
  }

  @RequirePermission('catalog.manage')
  @Delete('schedule/overrides/:id')
  async deleteScheduleOverride(
    @Req() request: AdminRequest,
    @Param('id') id: string,
  ) {
    return {
      data: await this.admins.deleteScheduleOverride(request.admin.adminId, id),
    };
  }

  @RequirePermission('catalog.manage')
  @Post('schedule/time-blocks')
  async scheduleTimeBlock(
    @Req() request: AdminRequest,
    @Body() dto: ScheduleTimeBlockDto,
  ) {
    return {
      data: await this.admins.saveScheduleTimeBlock(request.admin.adminId, dto),
    };
  }

  @RequirePermission('catalog.manage')
  @Delete('schedule/time-blocks/:id')
  async deleteScheduleTimeBlock(
    @Req() request: AdminRequest,
    @Param('id') id: string,
  ) {
    return {
      data: await this.admins.deleteScheduleTimeBlock(
        request.admin.adminId,
        id,
      ),
    };
  }

  @RequirePermission('content.manage')
  @Post('media/upload')
  async uploadMedia(@Req() request: AdminRequest, @Body() dto: MediaUploadDto) {
    return {
      data: await this.admins.uploadMedia(request.admin.adminId, dto),
    };
  }

  @RequirePermission('content.manage')
  @Get('content')
  async content() {
    return { data: await this.admins.content() };
  }

  @RequirePermission('content.manage')
  @Post('content/hero')
  async createHero(
    @Req() request: AdminRequest,
    @Body() dto: CatalogMutationDto,
  ) {
    return {
      data: await this.admins.saveHero(request.admin.adminId, dto.data),
    };
  }

  @RequirePermission('content.manage')
  @Put('content/hero/:id')
  async updateHero(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: CatalogMutationDto,
  ) {
    return {
      data: await this.admins.saveHero(request.admin.adminId, dto.data, id),
    };
  }

  @RequirePermission('content.manage')
  @Post('content/promo')
  async createPromo(
    @Req() request: AdminRequest,
    @Body() dto: CatalogMutationDto,
  ) {
    return {
      data: await this.admins.savePromo(request.admin.adminId, dto.data),
    };
  }

  @RequirePermission('content.manage')
  @Put('content/promo/:id')
  async updatePromo(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: CatalogMutationDto,
  ) {
    return {
      data: await this.admins.savePromo(request.admin.adminId, dto.data, id),
    };
  }

  @RequirePermission('content.manage')
  @Delete('content/:type/:id')
  async deleteContent(
    @Req() request: AdminRequest,
    @Param('type') type: 'hero' | 'promo',
    @Param('id') id: string,
  ) {
    if (!['hero', 'promo'].includes(type))
      throw new Error('نوع محتوای درخواستی معتبر نیست.');
    return {
      data: await this.admins.removeContent(request.admin.adminId, type, id),
    };
  }

  @RequirePermission('content.manage')
  @Put('content/business/:key')
  async businessContent(
    @Req() request: AdminRequest,
    @Param('key') key: string,
    @Body() dto: CatalogMutationDto,
  ) {
    return {
      data: await this.admins.saveBusinessContent(
        request.admin.adminId,
        key,
        dto.data.value,
        dto.data.isPublic !== false,
      ),
    };
  }

  @RequirePermission('catalog.read')
  @Get('catalog/:entity')
  async catalog(@Param('entity') entity: string) {
    return { data: await this.admins.catalog(entity) };
  }

  @RequirePermission('customers.manage')
  @Post('support-tickets/:id/reply')
  async supportReply(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: CatalogMutationDto,
  ) {
    return {
      data: await this.admins.replySupportTicket(
        request.admin.adminId,
        id,
        dto.data.body,
        dto.data.close === true,
      ),
    };
  }

  @RequirePermission('customers.manage')
  @Post('messages/broadcast')
  async broadcast(
    @Req() request: AdminRequest,
    @Body() dto: CatalogMutationDto,
  ) {
    return {
      data: await this.admins.broadcastMessage(
        request.admin.adminId,
        dto.data.body,
        dto.data.tierCode,
      ),
    };
  }

  @RequirePermission('catalog.manage')
  @Post('catalog/:entity')
  async createCatalog(
    @Req() request: AdminRequest,
    @Param('entity') entity: string,
    @Body() dto: CatalogMutationDto,
  ) {
    return {
      data: await this.admins.mutateCatalog(
        request.admin.adminId,
        entity,
        dto.data,
      ),
    };
  }

  @RequirePermission('catalog.manage')
  @Put('catalog/:entity/:id')
  async updateCatalog(
    @Req() request: AdminRequest,
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Body() dto: CatalogMutationDto,
  ) {
    return {
      data: await this.admins.mutateCatalog(
        request.admin.adminId,
        entity,
        dto.data,
        id,
      ),
    };
  }

  @RequirePermission('catalog.manage')
  @Delete('catalog/:entity/:id/permanent')
  async permanentlyDeleteCatalog(
    @Req() request: AdminRequest,
    @Param('entity') entity: string,
    @Param('id') id: string,
  ) {
    return {
      data: await this.admins.permanentlyDeleteCatalog(
        request.admin.adminId,
        entity,
        id,
      ),
    };
  }

  @RequirePermission('catalog.manage')
  @Delete('catalog/:entity/:id')
  async deleteCatalog(
    @Req() request: AdminRequest,
    @Param('entity') entity: string,
    @Param('id') id: string,
  ) {
    return {
      data: await this.admins.removeCatalog(request.admin.adminId, entity, id),
    };
  }

  @RequirePermission('logs.read')
  @Get('logs')
  async logs(@Query('range') range?: string) {
    return { data: await this.admins.logs(range) };
  }
}
