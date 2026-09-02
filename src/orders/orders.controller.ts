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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/createOrder.dto';
import { PaymentIntentInputDto } from './dto/paymentIntentInput.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrderParamsDto } from './dto/orderParams.dto';

interface JwtPayload {
  sub: number;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('create', 'Order'))
  @Post()
  create(@CurrentUser() userId: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId.sub, dto);
  }

  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'Order'))
  @Post(':orderId/payment')
  createPayment(
    @CurrentUser() userId: JwtPayload,
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
}
