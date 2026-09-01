import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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

  // Next up: GET /orders, GET /orders/:orderId, GET /orders/:orderId/history,
  // PATCH /orders/:orderId/status, POST /orders/:orderId/cancel.
}
