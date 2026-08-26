import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import {
  CancelBookingDto,
  CreateTicketDto,
  CustomerVehicleDto,
  JourneyEventDto,
  PushSubscriptionDto,
  RemovePushSubscriptionDto,
  ReplyTicketDto,
  UpdateCustomerVehicleDto,
} from './customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Customer account')
@ApiBearerAuth()
@UseGuards(CustomerAuthGuard)
@Controller('customers/me')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('bookings')
  async bookings(@Req() request: AuthenticatedRequest) {
    return { data: await this.customers.bookings(request.auth.customerId) };
  }

  @Get('bookings/active/next')
  async activeBooking(@Req() request: AuthenticatedRequest) {
    return {
      data: await this.customers.activeBooking(request.auth.customerId),
    };
  }

  @Get('bookings/:id')
  async booking(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.customers.booking(request.auth.customerId, id) };
  }

  @Get('invoices')
  async invoices(@Req() request: AuthenticatedRequest) {
    return { data: await this.customers.invoices(request.auth.customerId) };
  }

  @Get('invoices/:id')
  async invoice(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return {
      data: await this.customers.invoice(request.auth.customerId, id),
    };
  }

  @Post('bookings/:id/cancel')
  async cancelBooking(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return {
      data: await this.customers.cancelBooking(
        request.auth.customerId,
        id,
        dto.reason,
      ),
    };
  }

  @Get('vehicles')
  async vehicles(@Req() request: AuthenticatedRequest) {
    return { data: await this.customers.vehicles(request.auth.customerId) };
  }

  @Post('vehicles')
  async createVehicle(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CustomerVehicleDto,
  ) {
    return {
      data: await this.customers.createVehicle(request.auth.customerId, dto),
    };
  }

  @Put('vehicles/:id')
  async updateVehicle(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerVehicleDto,
  ) {
    return {
      data: await this.customers.updateVehicle(
        request.auth.customerId,
        id,
        dto,
      ),
    };
  }

  @Patch('vehicles/:id/default')
  async defaultVehicle(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return {
      data: await this.customers.setDefaultVehicle(request.auth.customerId, id),
    };
  }

  @Delete('vehicles/:id')
  async archiveVehicle(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return {
      data: await this.customers.archiveVehicle(request.auth.customerId, id),
    };
  }

  @Get('wallet')
  async wallet(@Req() request: AuthenticatedRequest) {
    return { data: await this.customers.wallet(request.auth.customerId) };
  }

  @Get('loyalty')
  async loyalty(@Req() request: AuthenticatedRequest) {
    return { data: await this.customers.loyalty(request.auth.customerId) };
  }

  @Get('notifications')
  async notifications(@Req() request: AuthenticatedRequest) {
    return {
      data: await this.customers.notifications(request.auth.customerId),
    };
  }

  @Patch('notifications/read-all')
  async readAllNotifications(@Req() request: AuthenticatedRequest) {
    return {
      data: await this.customers.readAllNotifications(request.auth.customerId),
    };
  }

  @Patch('notifications/:id/read')
  async readNotification(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return {
      data: await this.customers.readNotification(request.auth.customerId, id),
    };
  }

  @Post('push-subscriptions')
  async subscribe(
    @Req() request: AuthenticatedRequest,
    @Body() dto: PushSubscriptionDto,
  ) {
    return {
      data: await this.customers.subscribePush(
        request.auth.customerId,
        dto,
        request.headers['user-agent'],
      ),
    };
  }

  @Delete('push-subscriptions')
  async unsubscribe(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RemovePushSubscriptionDto,
  ) {
    return {
      data: await this.customers.unsubscribePush(
        request.auth.customerId,
        dto.endpoint,
      ),
    };
  }

  @Get('tickets')
  async tickets(@Req() request: AuthenticatedRequest) {
    return { data: await this.customers.tickets(request.auth.customerId) };
  }

  @Get('tickets/:id')
  async ticket(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.customers.ticket(request.auth.customerId, id) };
  }

  @Post('tickets')
  async createTicket(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTicketDto,
  ) {
    return {
      data: await this.customers.createTicket(request.auth.customerId, dto),
    };
  }

  @Post('tickets/:id/messages')
  async replyTicket(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return {
      data: await this.customers.replyTicket(
        request.auth.customerId,
        id,
        dto.message,
      ),
    };
  }

  @Post('journey/events')
  async journey(
    @Req() request: AuthenticatedRequest,
    @Body() dto: JourneyEventDto,
  ) {
    return { data: await this.customers.journey(request.auth.customerId, dto) };
  }
}
