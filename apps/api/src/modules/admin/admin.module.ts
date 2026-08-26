import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BookingCheckoutsModule } from '../booking-checkouts/booking-checkouts.module';
import { BookingHoldsModule } from '../booking-holds/booking-holds.module';
import { PaymentsModule } from '../payments/payments.module';
import { PickupModule } from '../pickup/pickup.module';
import {
  AdminAuthController,
  AdminController,
  PublicMediaController,
} from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [
    JwtModule.register({}),
    BookingHoldsModule,
    BookingCheckoutsModule,
    PaymentsModule,
    PickupModule,
  ],
  controllers: [AdminAuthController, AdminController, PublicMediaController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}
