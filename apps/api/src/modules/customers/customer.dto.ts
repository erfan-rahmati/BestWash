import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CustomerVehicleDto {
  @IsIn(['CATALOG', 'CUSTOM'])
  source!: 'CATALOG' | 'CUSTOM';

  @IsString()
  vehicleClassId!: string;

  @IsOptional()
  @IsString()
  vehicleModelId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  customBrandName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  customModelName?: string;

  @IsString()
  @Length(1, 50)
  color!: string;

  @IsString()
  plateNormalized!: string;

  @IsIn(['IRAN_CAR', 'IRAN_MOTORCYCLE'])
  plateType!: 'IRAN_CAR' | 'IRAN_MOTORCYCLE';

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsInt()
  @Min(1200)
  @Max(2200)
  productionYear?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class JourneyEventDto {
  @IsString()
  @Length(8, 120)
  sessionId!: string;

  @IsString()
  @Length(2, 80)
  eventName!: string;

  @IsString()
  @Length(1, 40)
  step!: string;
}

export class UpdateCustomerVehicleDto {
  @IsOptional()
  @IsString()
  vehicleClassId?: string;

  @IsOptional()
  @IsString()
  vehicleModelId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

  @IsOptional()
  @IsString()
  @Length(2, 30)
  plateNormalized?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  nickname?: string;

  @IsOptional()
  @IsInt()
  @Min(1200)
  @Max(2200)
  productionYear?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class PushSubscriptionDto {
  @IsUrl({ require_protocol: true })
  endpoint!: string;

  @IsString()
  @Length(20, 500)
  p256dh!: string;

  @IsString()
  @Length(8, 500)
  auth!: string;
}

export class RemovePushSubscriptionDto {
  @IsUrl({ require_protocol: true })
  endpoint!: string;
}

export class CreateTicketDto {
  @IsString()
  @Length(4, 120)
  subject!: string;

  @IsIn(['BOOKING', 'PAYMENT', 'VEHICLE', 'ACCOUNT', 'OTHER'])
  category!: string;

  @IsString()
  @Length(10, 2000)
  message!: string;
}

export class ReplyTicketDto {
  @IsString()
  @Length(2, 2000)
  message!: string;
}

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @Length(2, 300)
  reason?: string;
}
