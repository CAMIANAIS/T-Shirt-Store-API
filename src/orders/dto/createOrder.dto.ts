import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OrderAddressInputDto {
  @IsString()
  @IsNotEmpty()
  street1: string;

  @IsString()
  @IsNotEmpty()
  street2: string;

  @IsOptional()
  @IsString()
  street3?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  country: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => OrderAddressInputDto)
  shippingAddress: OrderAddressInputDto;
}
