import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  InferSubjects,
  MongoAbility,
} from '@casl/ability';

interface Order {
  order_id: number;
  user_id: number;
}
interface Product {
  product_id: number;
  status: string;
}

interface Cart {
  cart_id: number;
  user_id: number;
}

export interface JwtUser {
  sub: number;
  role: string;
  email: string;
}
type Action =
  | 'manage'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'cancel'
  | 'advanceStatus';
type Subject =
  InferSubjects<Order | Product | Cart> | 'Order' | 'Product' | 'Cart';
export type AppAbility = MongoAbility<[action: Action, subject: Subject]>;
@Injectable()
export class CaslAbilityFactory {
  createForUser(user: JwtUser) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
    if (user.role === 'manager') {
      can('manage', 'Product');
      can('read', 'Order');
      can('advanceStatus', 'Order', ['status']);
    }
    if (user.role === 'client') {
      can('create', 'Order', { user_id: user.sub });
      can('read', 'Order', { user_id: user.sub });
      can('cancel', 'Order', { user_id: user.sub });
      can('read', 'Product');
      can('manage', 'Cart', { user_id: user.sub });
    }
    return build();
  }
}
