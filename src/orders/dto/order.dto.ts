import { ApiProperty } from '@nestjs/swagger';

export class OrderLineItemDto {
  @ApiProperty({ example: 3 })
  productVariantId: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 2999, description: 'Price in cents, at order time' })
  priceAtPurchase: number;
}

export class OrderDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 7 })
  userId: number;

  @ApiProperty({ example: 5998, description: 'Total, in cents' })
  totalAmount: number;

  @ApiProperty({ type: [OrderLineItemDto] })
  items: OrderLineItemDto[];

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  createdAt: Date | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  updatedAt: Date | null;
}

export class PaymentIntentResultDto {
  @ApiProperty({ example: 'pi_3ABC123' })
  intentId: string;

  @ApiProperty({ example: 'pi_3ABC123_secret_xyz' })
  clientSecret: string;

  @ApiProperty({ example: 5998, description: 'Amount, in cents' })
  amount: number;

  @ApiProperty({ example: 'usd' })
  currency: string;
}
