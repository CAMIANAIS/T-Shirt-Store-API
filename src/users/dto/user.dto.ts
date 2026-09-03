export class UserDto {
  /** User id */
  id: number;

  /** Unique username */
  username: string;

  /** Unique email, also the sign-in identifier */
  email: string;

  birthdate: Date | null;

  /** Role name: manager, client, or delivery_person */
  role: string;

  createdAt: Date | null;

  updatedAt: Date | null;
}
