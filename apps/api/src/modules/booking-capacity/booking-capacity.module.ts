import { Module } from '@nestjs/common';
import { BookingCapacityService } from './booking-capacity.service';

@Module({
  providers: [BookingCapacityService],
  exports: [BookingCapacityService],
})
export class BookingCapacityModule {}
