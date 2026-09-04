import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CategoriesService, Category } from './categories.service';
import { CategoryDto } from './dto/category.dto';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { UpdateCategoryDto } from './dto/updateCategory.dto';
import { PaginationParamsDto } from '../common/dto/pagination.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { ErrorDto } from '../common/dto/error.dto';

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
    @Query() { limit, offset }: PaginationParamsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Category[]> {
    const { categories, total } = await this.categoriesService.findAll(
      limit,
      offset,
    );
    res.set('X-TotalCount', String(total));
    return categories;
  }

  @ApiOperation({ summary: 'Create a category (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: CategoryDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @ApiResponse({ status: 422, type: ErrorDto })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Category'))
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @ApiOperation({ summary: 'Update a category (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: CategoryDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @ApiResponse({ status: 422, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Category'))
  @Patch(':categoryId')
  update(
    @Param('categoryId') categoryId: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(categoryId, dto);
  }

  @ApiOperation({ summary: 'Delete a category (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Category'))
  @Delete(':categoryId')
  remove(@Param('categoryId') categoryId: number) {
    return this.categoriesService.remove(categoryId);
  }
}
