import { IsNotEmpty, IsNumber } from 'class-validator';

export class CartItemUpdateDto {
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
