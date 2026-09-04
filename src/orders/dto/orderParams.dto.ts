import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationParamsDto } from '../../common/dto/pagination.dto';

export class OrderParamsDto extends PaginationParamsDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'paid', 'processing', 'shipped', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;
}
