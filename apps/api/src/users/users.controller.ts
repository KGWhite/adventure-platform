import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CreateUserInput, SafeUser, UsersService } from './users.service.js';

class CreateUserDto implements CreateUserInput {
  username!: string;
  password!: string;
  role?: Role;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<SafeUser> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<SafeUser> {
    return this.usersService.findById(id);
  }
}
