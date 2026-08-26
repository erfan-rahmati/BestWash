import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  mobile!: string;

  @IsIn(['REGISTER_LOGIN', 'FORGOT_PASSWORD', 'DELEGATE_CHANGE'])
  purpose: 'REGISTER_LOGIN' | 'FORGOT_PASSWORD' | 'DELEGATE_CHANGE' =
    'REGISTER_LOGIN';
}

export class VerifyOtpDto extends RequestOtpDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class PasswordLoginDto {
  @IsString()
  mobile!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class SetPasswordDto {
  @IsString()
  @MinLength(8)
  @Length(8, 128)
  password!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @Length(5, 160)
  email?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, boolean>;
}
