import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsInt, Min } from 'class-validator';

export class CartItemInputDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  productVariantId: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}
