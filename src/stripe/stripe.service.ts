import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { EnvironmentVariables } from '../config/environment';

@Injectable()
export class StripeService extends Stripe {
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super(configService.get('STRIPE_SECRET_KEY', { infer: true }));
  }
}
