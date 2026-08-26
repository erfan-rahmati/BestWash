import { Module } from '@nestjs/common';
import { BookingCapacityModule } from '../booking-capacity/booking-capacity.module';
import { BookingCheckoutsController } from './booking-checkouts.controller';
import { BookingCheckoutsService } from './booking-checkouts.service';

@Module({
  imports: [BookingCapacityModule],

  controllers: [BookingCheckoutsController],

  providers: [BookingCheckoutsService],

  exports: [BookingCheckoutsService],
})
export class BookingCheckoutsModule {}
