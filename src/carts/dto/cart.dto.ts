import { ApiProperty } from '@nestjs/swagger';

export class LineItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 3 })
  productVariantId: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({
    example: 2999,
    description: 'Price in cents, at add-to-cart time',
  })
  priceAtPurchase: number;

  @ApiProperty({
    example: 5998,
    description: 'quantity * priceAtPurchase, in cents',
  })
  subtotal: number;
}

export class CartDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 7 })
  userId: number;

  @ApiProperty({ type: [LineItemDto] })
  items: LineItemDto[];
}
