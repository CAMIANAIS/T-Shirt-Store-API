import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ProductVariantInputDto {
  @ApiProperty({ enum: ['S', 'M', 'L', 'XL', 'XXL'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['S', 'M', 'L', 'XL', 'XXL'])
  size: string;

  @ApiProperty({ example: 'red' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsNotEmpty()
  stockQuantity: number;

  @ApiProperty({ example: 'TSH-RED-MD' })
  @IsString()
  @IsNotEmpty()
  skuCode: string;

  @ApiProperty({
    enum: ['active', 'inactive', 'discontinued'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: string;

  @ApiProperty({ example: 2999, description: 'Price in cents' })
  @IsNumber()
  @Min(0)
  price: number;
}
