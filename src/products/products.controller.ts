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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductInputDto } from './dto/createProduct.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductUpdateInputDto } from './dto/updateProduct.dto';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateProductImageDto, ProductImageDto } from './dto/productImage.dto';
import { ProductDto, PaymentLinkResultDto } from './dto/product.dto';
import { ErrorDto } from '../common/dto/error.dto';
interface JwtPayload {
  sub: number;
}
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @ApiOperation({ summary: 'List products' })
  @ApiQuery({ name: 'categoryId', required: false, example: 5 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, type: [ProductDto] })
  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(
    @Query('categoryId') categoryId: number,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    return this.productService.findAll(categoryId, limit, offset);
  }

  @ApiOperation({ summary: 'Create a product (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: ProductDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Product'))
  @Post()
  create(@Body() productInputDto: ProductInputDto) {
    return this.productService.create(productInputDto);
  }

  @ApiOperation({ summary: 'Get a product by id' })
  @ApiResponse({ status: 200, type: ProductDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @Get(':productId')
  findOne(@Param('productId') productId: number) {
    return this.productService.findOne(productId);
  }

  @ApiOperation({ summary: 'Update a product (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: ProductDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('update', 'Product'))
  @Patch(':productId')
  update(
    @Param('productId') productId: number,
    @Body() productUpdateInputDto: ProductUpdateInputDto,
  ) {
    return this.productService.update(productId, productUpdateInputDto);
  }

  @ApiOperation({ summary: 'Delete a product (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('delete', 'Product'))
  @Delete(':productId')
  remove(@Param('productId') productId: number) {
    return this.productService.remove(productId);
  }

  @ApiOperation({ summary: 'Activate a product (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: ProductDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @HttpCode(HttpStatus.OK)
  @Post(':productId/activate')
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('update', 'Product'))
  activate(@Param('productId') productId: number) {
    return this.productService.activate(productId);
  }

  @ApiOperation({ summary: 'Deactivate a product (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: ProductDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @HttpCode(HttpStatus.OK)
  @Post(':productId/deactivate')
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('update', 'Product'))
  deactivate(@Param('productId') productId: number) {
    return this.productService.deactivate(productId);
  }

  @ApiOperation({ summary: 'Like a product' })
  @ApiBearerAuth()
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JWTAuthGuard)
  @Post(':productId/likes')
  likeProduct(
    @CurrentUser() userId: JwtPayload,
    @Param('productId') productId: number,
  ) {
    return this.productService.likeProduct(userId.sub, productId);
  }

  @ApiOperation({ summary: 'Unlike a product' })
  @ApiBearerAuth()
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, type: ErrorDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JWTAuthGuard)
  @Delete(':productId/likes')
  unlikeProduct(
    @CurrentUser() userId: JwtPayload,
    @Param('productId') productId: number,
  ) {
    return this.productService.unlikeProduct(userId.sub, productId);
  }

  @ApiOperation({ summary: 'Create a Stripe Payment Link for this product' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: PaymentLinkResultDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JWTAuthGuard)
  @Post(':productId/paymentLink')
  createPaymentLink(
    @CurrentUser() userId: JwtPayload,
    @Param('productId') productId: number,
  ) {
    return this.productService.createPaymentLink(userId.sub, productId);
  }

  @ApiOperation({ summary: "List a product's images" })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, type: [ProductImageDto] })
  @ApiResponse({ status: 404, type: ErrorDto })
  @Get(':productId/images')
  findImages(
    @Param('productId') productId: number,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    return this.productService.findImages(productId, limit, offset);
  }

  @ApiOperation({ summary: 'Upload a product image (manager only)' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateProductImageDto })
  @ApiResponse({ status: 201, type: ProductImageDto })
  @ApiResponse({ status: 400, type: ErrorDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
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
