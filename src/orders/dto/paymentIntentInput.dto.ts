import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class PaymentIntentInputDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['card', 'bank_account', 'apple_pay', 'google_pay'])
  paymentMethod: string;
}
