import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Min, IsInt } from 'class-validator';

export class CartItemUpdateDto {
  @ApiProperty({ example: 3 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}
