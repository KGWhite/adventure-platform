import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';

export type SafeUser = Omit<User, 'passwordHash'>;

export function sanitizeUser<T extends { passwordHash?: string }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash, ...safe } = user;
  return safe;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existing) {
      throw new ConflictException(`Username '${input.username}' already exists`);
    }

    const passwordHash = await bcryptjs.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
        role: input.role ?? Role.USER,
      },
    });

    return sanitizeUser(user);
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }
    return sanitizeUser(user);
  }

  async findByUsername(username: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      throw new NotFoundException(`User with username '${username}' not found`);
    }
    return sanitizeUser(user);
  }

  async findWithPassword(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }
}
