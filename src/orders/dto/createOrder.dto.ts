import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OrderAddressInputDto {
  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  street1: string;

  @ApiProperty({ example: 'Apt 4B' })
  @IsString()
  @IsNotEmpty()
  street2: string;

  @ApiProperty({ example: 'Building C', required: false })
  @IsOptional()
  @IsString()
  street3?: string;

  @ApiProperty({ example: 'Springfield' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'IL' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: OrderAddressInputDto })
  @ValidateNested()
  @Type(() => OrderAddressInputDto)
  shippingAddress: OrderAddressInputDto;
}
