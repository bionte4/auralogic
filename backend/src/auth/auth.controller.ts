import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { readAppEnv } from '../config/env';
import { clearAuthCookies, createCsrfToken, setAuthCookies } from './auth-cookies';
import { AuthService, type AuthUser } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';

const RESET_REQUEST_MESSAGE = 'If an account exists for that email, a reset link is on its way.';

const AUTH_LIMIT = { default: { limit: 8, ttl: 60_000 } };

interface AuthResponse {
  user: AuthUser;
  expiresInSeconds: number;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<AuthResponse> {
    const result = await this.authService.login(dto);
    setAuthCookies(response, readAppEnv(), result.accessToken, createCsrfToken());
    return { user: result.user, expiresInSeconds: result.expiresInSeconds };
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response): Promise<AuthResponse> {
    const result = await this.authService.register(dto);
    setAuthCookies(response, readAppEnv(), result.accessToken, createCsrfToken());
    return { user: result.user, expiresInSeconds: result.expiresInSeconds };
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.requestPasswordReset(dto);
    return { message: RESET_REQUEST_MESSAGE };
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    return { message: 'Your password has been updated.' };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthUser {
    return { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale };
  }

  @Patch('locale')
  updateLocale(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateLocaleDto): Promise<AuthUser> {
    return this.authService.updateLocale(user.id, dto.locale);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    clearAuthCookies(response, readAppEnv());
  }
}
