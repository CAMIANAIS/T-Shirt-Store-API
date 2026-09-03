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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { ProductInputDto } from './dto/createProduct.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductUpdateInputDto } from './dto/updateProduct.dto';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateProductImageDto } from './dto/productImage.dto';
interface JwtPayload {
  sub: number;
}
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
  @Post(':productId/activate')
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('update', 'Product'))
  activate(@Param('productId') productId: number) {
    return this.productService.activate(productId);
  }
  @Post(':productId/deactivate')
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('update', 'Product'))
  deactivate(@Param('productId') productId: number) {
    return this.productService.deactivate(productId);
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JWTAuthGuard)
  @Post(':productId/likes')
  likeProduct(
    @CurrentUser() userId: JwtPayload,
    @Param('productId') productId: number,
  ) {
    return this.productService.likeProduct(userId.sub, productId);
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JWTAuthGuard)
  @Delete(':productId/likes')
  unlikeProduct(
    @CurrentUser() userId: JwtPayload,
    @Param('productId') productId: number,
  ) {
    return this.productService.unlikeProduct(userId.sub, productId);
  }

  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JWTAuthGuard)
  @Post(':productId/paymentLink')
  createPaymentLink(
    @CurrentUser() userId: JwtPayload,
    @Param('productId') productId: number,
  ) {
    return this.productService.createPaymentLink(userId.sub, productId);
  }

  @Get(':productId/images')
  findImages(
    @Param('productId') productId: number,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    return this.productService.findImages(productId, limit, offset);
  }

  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Product'))
  @Post(':productId/images')
  @UseInterceptors(FileInterceptor('file'))
  addImage(
    @Param('productId') productId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() createProductImageDto: CreateProductImageDto,
  ) {
    return this.productService.addImage(productId, file, createProductImageDto);
  }
}
