import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SafeUser, UsersService } from './users.service.js';

// Role is intentionally not accepted from clients; new users are always USER.
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createUser(@Body() dto: CreateUserDto): Promise<SafeUser> {
    return this.usersService.create({
      username: dto.username,
      password: dto.password,
      role: Role.USER,
    });
  }

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<SafeUser> {
    return this.usersService.findById(id);
  }
}
