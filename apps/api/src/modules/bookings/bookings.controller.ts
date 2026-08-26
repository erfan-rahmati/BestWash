import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { CustomerAuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(CustomerAuthGuard)
  @Get(':code')
  async findByCode(
    @Param('code')
    code: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      data: await this.bookingsService.findByCode(
        code,
        request.auth.customerId,
      ),
    };
  }
}
