import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TestPaymentProvider } from './providers/test-payment.provider';
import { ZibalPaymentProvider } from './providers/zibal-payment.provider';
import { ZarinpalPaymentProvider } from './providers/zarinpal-payment.provider';

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    TestPaymentProvider,
    ZibalPaymentProvider,
    ZarinpalPaymentProvider,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
