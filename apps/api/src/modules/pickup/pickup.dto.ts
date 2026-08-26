import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateDelegateDto {
  @IsIn(['OWNER', 'DELEGATE'])
  pickupMode!: 'OWNER' | 'DELEGATE';

  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}

export class VerifyPickupDto {
  @IsString()
  bookingId!: string;

  @Matches(/^\d{6}$/)
  code!: string;
}

export class TransitionBookingDto {
  @IsIn([
    'CONFIRMED',
    'ADMIN_REJECTED',
    'CHECKED_IN',
    'IN_QUEUE',
    'IN_PROGRESS',
    'READY_FOR_PICKUP',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
  ])
  status!:
    | 'CONFIRMED'
    | 'ADMIN_REJECTED'
    | 'CHECKED_IN'
    | 'IN_QUEUE'
    | 'IN_PROGRESS'
    | 'READY_FOR_PICKUP'
    | 'DELIVERED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW';

  @IsOptional()
  @IsString()
  @Length(2, 500)
  reason?: string;
}
