import { IsNumber, IsOptional } from 'class-validator';
import { PaginationParamsDto } from '../../common/dto/pagination.dto';

export class ProductListParamsDto extends PaginationParamsDto {
  @IsOptional()
  @IsNumber()
  categoryId?: number;
}
