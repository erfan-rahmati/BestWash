import { Module } from '@nestjs/common';
import { BookingCapacityModule } from '../booking-capacity/booking-capacity.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [BookingCapacityModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
