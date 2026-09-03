import { subject } from '@casl/ability';
import { CaslAbilityFactory } from './casl-ability.factory';

describe('CaslAbilityFactory', () => {
  const factory = new CaslAbilityFactory();

  describe('Category', () => {
    it('manager can manage categories', () => {
      const ability = factory.createForUser({
        sub: 1,
        role: 'manager',
        email: 'manager@store.com',
      });
      expect(ability.can('manage', 'Category')).toBe(true);
    });

    it('client cannot manage categories', () => {
      const ability = factory.createForUser({
        sub: 1,
        role: 'client',
        email: 'client@store.com',
      });
      expect(ability.can('manage', 'Category')).toBe(false);
    });
  });

  describe('User', () => {
    it('manager can read and delete any user', () => {
      const ability = factory.createForUser({
        sub: 1,
        role: 'manager',
        email: 'manager@store.com',
      });
      expect(ability.can('read', 'User')).toBe(true);
      expect(ability.can('delete', 'User')).toBe(true);
    });

    it('client cannot read or delete other users', () => {
      const ability = factory.createForUser({
        sub: 1,
        role: 'client',
        email: 'client@store.com',
      });
      expect(ability.can('read', 'User')).toBe(false);
      expect(ability.can('delete', 'User')).toBe(false);
    });

    it('both roles can update only their own profile', () => {
      const clientAbility = factory.createForUser({
        sub: 5,
        role: 'client',
        email: 'client@store.com',
      });
      expect(clientAbility.can('update', subject('User', { user_id: 5 }))).toBe(
        true,
      );
      expect(
        clientAbility.can('update', subject('User', { user_id: 99 })),
      ).toBe(false);

      const managerAbility = factory.createForUser({
        sub: 5,
        role: 'manager',
        email: 'manager@store.com',
      });
      expect(
        managerAbility.can('update', subject('User', { user_id: 5 })),
      ).toBe(true);
      expect(
        managerAbility.can('update', subject('User', { user_id: 99 })),
      ).toBe(false);
    });
  });
});
