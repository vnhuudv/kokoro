import { Controller, Get, Query, Redirect, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  health() { return { status: 'ok' }; }

  @Get('slack')
  @Redirect()
  loginWithSlack() {
    return { url: this.authService.slackOAuthUrl() };
  }

  @Get('slack/callback')
  async slackCallback(@Query('code') code: string, @Res() res: Response) {
    const dashboard = process.env.DASHBOARD_URL ?? 'http://localhost:5173';
    try {
      const token = await this.authService.exchangeCodeForJwt(code);
      res.redirect(`${dashboard}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch {
      res.redirect(`${dashboard}/login?error=auth_failed`);
    }
  }
}
