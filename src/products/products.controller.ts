import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductInputDto } from './dto/createProduct.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';

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

  @UseGuards(JWTAuthGuard)
  @Post()
  create(@Body() productInputDto: ProductInputDto) {
    return this.productService.create(productInputDto);
  }

  @Get(':productId')
  findOne(@Param('productId') productId: number) {
    return this.productService.findOne(productId);
  }
}
