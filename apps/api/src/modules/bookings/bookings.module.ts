import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookingCapacityModule } from '../booking-capacity/booking-capacity.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [AuthModule, BookingCapacityModule],

  controllers: [BookingsController],

  providers: [BookingsService],

  exports: [BookingsService],
})
export class BookingsModule {}
