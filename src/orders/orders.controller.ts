import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/createOrder.dto';
import { PaymentIntentInputDto } from './dto/paymentIntentInput.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrderParamsDto } from './dto/orderParams.dto';
import type { JwtUser } from '../casl/casl-ability.factory';
import { UpdateOrderStatusDto } from './dto/updateOrderStatus.dto';
import { OrderDto, PaymentIntentResultDto } from './dto/order.dto';
import { OrderStatusHistoryDto } from './dto/orderStatusHistory.dto';
import { ErrorDto } from '../common/dto/error.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: "Create an order from the caller's cart" })
  @ApiResponse({ status: 201, type: OrderDto })
  @ApiResponse({ status: 400, type: ErrorDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @ApiResponse({ status: 422, type: ErrorDto })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('create', 'Order'))
  @Post()
  create(@CurrentUser() userId: JwtUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId.sub, dto);
  }

  @ApiOperation({
    summary: 'Create a Stripe Payment Intent for an order',
    description:
      'Order must belong to the caller and be in `pending` status. Re-validates stock ' +
      'right before creating the intent.',
  })
  @ApiResponse({ status: 201, type: PaymentIntentResultDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @ApiResponse({ status: 422, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'Order'))
  @Post(':orderId/payment')
  createPayment(
    @CurrentUser() userId: JwtUser,
    @Param('orderId') orderId: number,
    @Body() dto: PaymentIntentInputDto,
  ) {
    return this.ordersService.createPayment(userId.sub, orderId, dto);
  }

  @ApiOperation({ summary: 'Get all orders (manager only)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'minAmount', required: false })
  @ApiQuery({ name: 'maxAmount', required: false })
  @ApiResponse({ status: 200, type: [OrderDto] })
  @ApiResponse({ status: 400, type: ErrorDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Order'))
  @Get()
  getAllOrders(@Query() dto: OrderParamsDto) {
    return this.ordersService.getOrders(dto);
  }

  @ApiOperation({ summary: 'Get an order by id' })
  @ApiResponse({ status: 200, type: OrderDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'Order'))
  @Get(':orderId')
  findOne(@CurrentUser() user: JwtUser, @Param('orderId') orderId: number) {
    return this.ordersService.findOne(
      orderId,
      user.sub,
      user.role === 'manager',
    );
  }

  @ApiOperation({ summary: "Get an order's status history" })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, type: [OrderStatusHistoryDto] })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'Order'))
  @Get(':orderId/status-history')
  getStatusHistory(
    @CurrentUser() user: JwtUser,
    @Param('orderId') orderId: number,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ) {
    return this.ordersService.getStatusHistory(
      orderId,
      user.sub,
      user.role === 'manager',
      limit,
      offset,
    );
  }

  @ApiOperation({
    summary: 'Advance an order status (manager only)',
    description: 'Legal transitions only: paid -> processing -> shipped.',
  })
  @ApiResponse({ status: 200, type: OrderStatusHistoryDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('advanceStatus', 'Order'))
  @Patch(':orderId/status')
  postStatusHistory(
    @CurrentUser() user: JwtUser,
    @Param('orderId') orderId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.postStatusHistory(
      orderId,
      dto.status,
      user.email,
      user.sub,
    );
  }

  @ApiOperation({
    summary: "Cancel the caller's own order",
    description: 'Only legal before the order is shipped.',
  })
  @ApiResponse({ status: 200, type: OrderDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('cancel', 'Order'))
  @Post(':orderId/cancel')
  cancelOrder(@CurrentUser() user: JwtUser, @Param('orderId') orderId: number) {
    return this.ordersService.cancelOrder(orderId, user.sub, user.email);
  }
}
