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

interface Category {
  category_id: number;
}

interface User {
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
  | InferSubjects<Order | Product | Cart | Category | User>
  | 'Order'
  | 'Product'
  | 'Cart'
  | 'Category'
  | 'User';
export type AppAbility = MongoAbility<[action: Action, subject: Subject]>;
@Injectable()
export class CaslAbilityFactory {
  createForUser(user: JwtUser) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
    if (user.role === 'manager') {
      can('manage', 'Product');
      can('manage', 'Order');
      can('advanceStatus', 'Order', ['status']);
      can('manage', 'Category');
      can('read', 'User');
      can('delete', 'User');
    }
    if (user.role === 'client') {
      can('create', 'Order', { user_id: user.sub });
      can('read', 'Order', { user_id: user.sub });
      can('cancel', 'Order', { user_id: user.sub });
      can('read', 'Product');
      can('manage', 'Cart', { user_id: user.sub });
    }
    // Both roles: update own profile only, never someone else's.
    can('update', 'User', { user_id: user.sub });
    return build();
  }
}
