import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService, LoginDto } from './auth.service.js';
import { CurrentUser, type RequestUser } from './decorators/current-user.decorator.js';

import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getCurrentUser(user.id);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { status: 'ok' };
  }
}
