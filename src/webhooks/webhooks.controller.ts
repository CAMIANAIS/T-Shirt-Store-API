import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { WebhooksService } from './webhooks.service';
import { StripeService } from '../stripe/stripe.service';
import { EnvironmentVariables } from '../config/environment';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw request body');
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET', { infer: true }),
      );
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }

    await this.webhooksService.handleEvent(event);
  }
}
