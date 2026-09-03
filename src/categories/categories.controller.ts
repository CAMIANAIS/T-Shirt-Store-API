import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CategoriesService, Category } from './categories.service';
import { CategoryDto } from './dto/category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'List categories' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, type: [CategoryDto] })
  @Get()
  async findAll(
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Category[]> {
    const { categories, total } = await this.categoriesService.findAll(
      limit,
      offset,
    );
    res.set('X-TotalCount', String(total));
    return categories;
  }
}
