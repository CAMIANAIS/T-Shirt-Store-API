import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CartItemInputDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  productVariantId: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
