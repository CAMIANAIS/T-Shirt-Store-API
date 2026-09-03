import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ProductVariantUpdateInputDto {
  @ApiProperty({ enum: ['S', 'M', 'L', 'XL', 'XXL'], required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['S', 'M', 'L', 'XL', 'XXL'])
  size?: string;

  @ApiProperty({ example: 'red', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @ApiProperty({ example: 'TSH-RED-MD', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  skuCode?: string;

  @ApiProperty({
    enum: ['active', 'inactive', 'discontinued'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: string;
}
