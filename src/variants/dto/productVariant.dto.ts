import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantDto {
  @ApiProperty({ example: 1 })
  productVariantId: number;

  @ApiProperty({ example: 5 })
  productId: number;

  @ApiProperty({ enum: ['S', 'M', 'L', 'XL', 'XXL'] })
  size: string;

  @ApiProperty({ example: 'red' })
  color: string;

  @ApiProperty({ example: 10 })
  stockQuantity: number;

  @ApiProperty({ example: 'TSH-RED-MD' })
  skuCode: string;

  @ApiProperty({ enum: ['active', 'inactive', 'discontinued'] })
  status: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  createdAt: Date | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  updatedAt: Date | null;
}
