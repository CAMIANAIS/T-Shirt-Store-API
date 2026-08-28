import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ProductVariantInputDto {
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
  status?: string;
}
