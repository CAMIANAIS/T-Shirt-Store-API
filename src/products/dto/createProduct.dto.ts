import { Type } from 'class-transformer';
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
  @IsString()
  @IsNotEmpty()
  @IsIn(['S', 'M', 'L', 'XL', 'XXL'])
  size: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsNumber()
  @IsNotEmpty()
  stockQuantity: number;

  @IsString()
  @IsNotEmpty()
  skuCode: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'discontinued'])
  status: string;

  @IsNumber()
  @Min(0)
  price: number;
}
export class ProductInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive', 'discontinued'])
  status: string;

  @IsNumber()
  categoryId: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}
