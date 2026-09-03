import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CartItemUpdateDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
