import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  BookingCheckoutsService,
  type CreateBookingCheckoutInput,
} from './booking-checkouts.service';

@Controller('booking-checkouts')
export class BookingCheckoutsController {
  constructor(
    private readonly bookingCheckoutsService: BookingCheckoutsService,
  ) {}

  @Post()
  async create(
    @Body()
    body: CreateBookingCheckoutInput,
  ) {
    return {
      data: await this.bookingCheckoutsService.create(body),
    };
  }

  @Get(':token')
  async findByToken(
    @Param('token')
    token: string,
  ) {
    return {
      data: await this.bookingCheckoutsService.findByToken(token),
    };
  }

  @Delete(':token')
  async cancel(
    @Param('token')
    token: string,
  ) {
    return {
      data: await this.bookingCheckoutsService.cancel(token),
    };
  }
}
