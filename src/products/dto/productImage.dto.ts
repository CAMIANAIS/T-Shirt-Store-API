import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Raw image file bytes. Supported formats: jpg, png, webp, gif',
  })
  file: unknown;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiProperty({ example: 'Product front view', required: false })
  @IsOptional()
  @IsString()
  altText?: string;
}

export class ProductImageDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example:
      'https://bucket.s3.us-east-2.amazonaws.com/products/5/uuid.png?...',
  })
  url: string;

  @ApiProperty({ example: 0 })
  displayOrder: number;

  @ApiProperty({ example: 'Product front view', nullable: true })
  altText: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  createdAt: Date | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  updatedAt: Date | null;
}
