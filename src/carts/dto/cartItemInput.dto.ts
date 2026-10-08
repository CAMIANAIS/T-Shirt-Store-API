import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsInt, IsPositive } from 'class-validator';

export class CartItemInputDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  productVariantId: number;

  @ApiProperty({ example: 2 })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  quantity: number;
}
