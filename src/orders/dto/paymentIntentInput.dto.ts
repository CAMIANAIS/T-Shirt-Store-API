import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class PaymentIntentInputDto {
  @ApiProperty({ enum: ['card', 'bank_account', 'apple_pay', 'google_pay'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['card', 'bank_account', 'apple_pay', 'google_pay'])
  paymentMethod: string;
}
