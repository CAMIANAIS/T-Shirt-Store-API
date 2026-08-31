import { IsNotEmpty, IsNumber } from 'class-validator';

export class CartItemInputDto {
  @IsNumber()
  @IsNotEmpty()
  productVariantId: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
