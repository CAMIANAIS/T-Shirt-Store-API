import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ProductVariantUpdateInputDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['S', 'M', 'L', 'XL', 'XXL'])
  size?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  skuCode?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: string;
}
