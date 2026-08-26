import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { BookingHoldsService } from './booking-holds.service';

interface CreateBookingHoldBody {
  vehicleClassId?: string;
  packageId?: string;
  addonIds?: string[];
  startAt?: string;
}

@Controller('booking-holds')
export class BookingHoldsController {
  constructor(private readonly bookingHoldsService: BookingHoldsService) {}

  @Post()
  async create(
    @Body()
    body: CreateBookingHoldBody,
  ) {
    return {
      data: await this.bookingHoldsService.create(body),
    };
  }

  @Get(':token')
  async get(
    @Param('token')
    token: string,
  ) {
    return {
      data: await this.bookingHoldsService.findByToken(token),
    };
  }

  @Delete(':token')
  async cancel(
    @Param('token')
    token: string,
  ) {
    return {
      data: await this.bookingHoldsService.cancel(token),
    };
  }
}
