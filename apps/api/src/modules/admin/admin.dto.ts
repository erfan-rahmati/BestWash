import {
  IsBoolean,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  Matches,
} from 'class-validator';
import type { BookingCheckoutVehicleInput } from '../booking-checkouts/booking-checkouts.service';

export class AdminLoginDto {
  @IsString()
  @Length(4, 64)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  username!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsOptional()
  @Matches(/^\d{6}$/)
  otpCode?: string;

  @IsOptional()
  @IsString()
  challengeId?: string;
}

export class ManualBookingDto {
  @IsString()
  mobile!: string;

  @IsString()
  vehicleClassId!: string;

  @IsString()
  packageId!: string;

  @IsArray()
  addonIds: string[] = [];

  @IsString()
  startAt!: string;

  @IsObject()
  vehicle!: BookingCheckoutVehicleInput;

  @IsIn(['OWNER', 'DELEGATE'])
  pickupMode: 'OWNER' | 'DELEGATE' = 'OWNER';

  @IsOptional()
  @IsObject()
  delegate?: { fullName: string; mobile: string };
}

export class AdminPaymentDto {
  @IsString()
  @Length(8, 200)
  idempotencyKey!: string;
}

export class CatalogMutationDto {
  @IsObject()
  data!: Record<string, unknown>;
}

export class UpdateCustomerTierDto {
  @IsString()
  tierId!: string;
}

export class PickupReminderDto {
  @IsOptional()
  @IsString()
  @Length(2, 240)
  message?: string;
}

export class ScheduleRuleDto {
  @IsInt()
  @Min(1)
  @Max(7)
  weekday!: number;

  @IsBoolean()
  isOpen!: boolean;

  @IsInt()
  @Min(360)
  @Max(1440)
  openMinute!: number;

  @IsInt()
  @Min(360)
  @Max(1440)
  closeMinute!: number;

  @IsInt()
  @Min(1)
  @Max(20)
  capacity!: number;

  @IsInt()
  @IsIn([30])
  slotStepMinutes!: number;
}

export class ScheduleOverrideDto {
  @IsDateString()
  localDate!: string;

  @IsBoolean()
  isClosed!: boolean;

  @IsOptional()
  @IsInt()
  @Min(360)
  @Max(1440)
  openMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(360)
  @Max(1440)
  closeMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  capacity?: number;

  @IsOptional()
  @IsString()
  @Length(2, 240)
  note?: string;
}

export class ScheduleTimeBlockDto {
  @IsDateString()
  localDate!: string;

  @IsInt()
  @Min(360)
  @Max(1410)
  startMinute!: number;

  @IsInt()
  @Min(390)
  @Max(1440)
  endMinute!: number;

  @IsString()
  @Length(2, 240)
  reason!: string;
}

export class MediaUploadDto {
  @IsString()
  @Length(2, 160)
  fileName!: string;

  @IsString()
  @Matches(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/)
  dataUrl!: string;

  @IsString()
  @Length(2, 200)
  altText!: string;

  @IsOptional()
  @IsString()
  @Length(2, 160)
  title?: string;
}

export class AdminPushSubscriptionDto {
  @IsString()
  endpoint!: string;

  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;
}
