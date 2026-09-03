import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({ example: 1 })
  productId: number;

  @ApiProperty({ example: 'summer-tshirt' })
  name: string;

  @ApiProperty({ example: 'long sleeves, 100% cotton' })
  description: string;

  @ApiProperty({ enum: ['active', 'inactive', 'discontinued'] })
  status: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  createdAt: Date | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ example: null, nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ example: 5 })
  categoryId: number;
}

export class PaymentLinkResultDto {
  @ApiProperty({ example: 'https://buy.stripe.com/test_abc' })
  paymentLink: string;

  @ApiProperty({ type: 'string', example: null, nullable: true })
  expiresAt: null;
}
