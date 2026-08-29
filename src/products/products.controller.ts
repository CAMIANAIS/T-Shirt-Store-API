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
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductInputDto } from './dto/createProduct.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductUpdateInputDto } from './dto/updateProduct.dto';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(
    @Query('categoryId') categoryId: number,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    return this.productService.findAll(categoryId, limit, offset);
  }

  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Product'))
  @Post()
  create(@Body() productInputDto: ProductInputDto) {
    return this.productService.create(productInputDto);
  }

  @Get(':productId')
  findOne(@Param('productId') productId: number) {
    return this.productService.findOne(productId);
  }

  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('update', 'Product'))
  @Patch(':productId')
  update(
    @Param('productId') productId: number,
    @Body() productUpdateInputDto: ProductUpdateInputDto,
  ) {
    return this.productService.update(productId, productUpdateInputDto);
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('delete', 'Product'))
  @Delete(':productId')
  remove(@Param('productId') productId: number) {
    return this.productService.remove(productId);
  }
}
