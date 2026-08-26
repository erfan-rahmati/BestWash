import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { ServicesModule } from './modules/services/services.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingHoldsModule } from './modules/booking-holds/booking-holds.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BookingCheckoutsModule } from './modules/booking-checkouts/booking-checkouts.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnvironment } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PickupModule } from './modules/pickup/pickup.module';
import { AdminModule } from './modules/admin/admin.module';
import { ContentModule } from './modules/content/content.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    HealthModule,
    VehiclesModule,
    ServicesModule,
    AvailabilityModule,
    BookingHoldsModule,
    BookingCheckoutsModule,
    BookingsModule,
    AuthModule,
    PaymentsModule,
    CustomersModule,
    PickupModule,
    AdminModule,
    ContentModule,
  ],
})
export class AppModule {}
