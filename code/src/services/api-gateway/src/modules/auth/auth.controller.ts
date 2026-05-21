import { Controller, Get, Query, Redirect, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('health')
  health() { return { status: 'ok' }; }

  @Get('slack')
  @Redirect()
  loginWithSlack() {
    return { url: this.authService.slackOAuthUrl() };
  }

  @Get('slack/callback')
  async slackCallback(@Query('code') code: string | undefined, @Res() res: Response) {
    const dashboard = process.env.DASHBOARD_URL ?? 'http://localhost:5173';
    if (!code) {
      return res.redirect(`${dashboard}/login?error=auth_cancelled`);
    }
    try {
      const token = await this.authService.exchangeCodeForJwt(code);
      res.redirect(`${dashboard}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (err) {
      this.logger.error(`Slack callback failed: ${err}`);
      res.redirect(`${dashboard}/login?error=auth_failed`);
    }
  }
}
