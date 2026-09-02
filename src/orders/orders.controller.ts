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

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('create', 'Order'))
  @Post()
  create(@CurrentUser() userId: JwtUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId.sub, dto);
  }

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

  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Order'))
  @Get()
  getAllOrders(@Query() dto: OrderParamsDto) {
    return this.ordersService.getOrders(dto);
  }
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

  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('cancel', 'Order'))
  @Post(':orderId/cancel')
  cancelOrder(@CurrentUser() user: JwtUser, @Param('orderId') orderId: number) {
    return this.ordersService.cancelOrder(orderId, user.sub, user.email);
  }
}
