import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class CartItemUpdateDto {
  @ApiProperty({ example: 3 })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  quantity: number;
}
