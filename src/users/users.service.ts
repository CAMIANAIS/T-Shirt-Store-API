import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { users } from '../../generated/prisma/client';
import { usersGetPayload } from '../../generated/prisma/models';
import { UpdateMeDto } from './dto/updateMe.dto';

export type User = {
  id: number;
  username: string;
  email: string;
  birthdate: Date | null;
  role: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  private toUser(row: usersGetPayload<{ include: { roles: true } }>): User {
    return {
      id: row.user_id,
      username: row.username,
      email: row.email,
      birthdate: row.birthdate,
      role: row.roles.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async userByEmail(email: string) {
    const user = await this.prismaService.users.findFirst({
      where: { email, deleted_at: null },
    });
    return user;
  }

  async createUser(
    email: string,
    username: string,
    password_hash: string,
    role_id: number,
    birthdate?: string,
  ): Promise<users> {
    const user = await this.prismaService.users.create({
      data: {
        email,
        username,
        password_hash,
        role_id,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        carts: {
          create: {},
        },
      },
    });

    return user;
  }

  async findAll(limit?: number, offset?: number): Promise<User[]> {
    const rows = await this.prismaService.users.findMany({
      where: { deleted_at: null },
      include: { roles: true },
      take: limit,
      skip: offset,
    });
    return rows.map((row) => this.toUser(row));
  }

  async findOne(userId: number): Promise<User> {
    const user = await this.prismaService.users.findFirst({
      where: { user_id: userId, deleted_at: null },
      include: { roles: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toUser(user);
  }

  async updateOwnProfile(userId: number, dto: UpdateMeDto): Promise<User> {
    if (dto.username) {
      const conflicting = await this.prismaService.users.findFirst({
        where: { username: dto.username, user_id: { not: userId } },
      });
      if (conflicting) {
        throw new ConflictException('Username already taken');
      }
    }

    const updated = await this.prismaService.users.update({
      where: { user_id: userId },
      data: {
        ...(dto.username && { username: dto.username }),
        ...(dto.birthdate && { birthdate: new Date(dto.birthdate) }),
      },
      include: { roles: true },
    });
    return this.toUser(updated);
  }

  async remove(userId: number): Promise<void> {
    await this.findOne(userId);

    await this.prismaService.users.update({
      where: { user_id: userId },
      data: { deleted_at: new Date() },
    });
  }
}
