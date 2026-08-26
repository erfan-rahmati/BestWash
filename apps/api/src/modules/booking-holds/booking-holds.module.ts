import { Module } from '@nestjs/common';
import { BookingCapacityModule } from '../booking-capacity/booking-capacity.module';
import { BookingHoldsController } from './booking-holds.controller';
import { BookingHoldsService } from './booking-holds.service';

@Module({
  imports: [BookingCapacityModule],
  controllers: [BookingHoldsController],
  providers: [BookingHoldsService],
  exports: [BookingHoldsService],
})
export class BookingHoldsModule {}
