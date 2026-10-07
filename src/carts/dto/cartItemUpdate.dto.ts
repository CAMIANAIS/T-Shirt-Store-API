import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, IsInt } from 'class-validator';

export class CartItemUpdateDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}
