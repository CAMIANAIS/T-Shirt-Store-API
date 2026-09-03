import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class VariantDto {
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
  status: string;

  @ApiProperty({ example: 2999, description: 'Price in cents' })
  @IsNumber()
  @Min(0)
  price: number;
}
export class ProductInputDto {
  @ApiProperty({ example: 'summer-tshirt' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'long sleeves, 100% cotton' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ['active', 'inactive', 'discontinued'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive', 'discontinued'])
  status: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  categoryId: number;

  @ApiProperty({ type: [VariantDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}
