import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class InitiatePaymentDto {
  @IsString()
  @Length(10, 200)
  checkoutToken!: string;

  @IsOptional()
  @IsBoolean()
  useWallet?: boolean;

  @IsOptional()
  @IsString()
  @Length(2, 40)
  couponCode?: string;

  @IsOptional()
  @IsIn(['OWNER', 'DELEGATE'])
  pickupMode?: 'OWNER' | 'DELEGATE';

  @IsOptional()
  @IsString()
  @Length(2, 100)
  delegateName?: string;

  @IsOptional()
  @IsString()
  delegateMobile?: string;
}

export class PaymentQuoteDto {
  @IsString()
  @Length(10, 200)
  checkoutToken!: string;

  @IsOptional()
  @IsBoolean()
  useWallet?: boolean;

  @IsOptional()
  @IsString()
  @Length(2, 40)
  couponCode?: string;
}
