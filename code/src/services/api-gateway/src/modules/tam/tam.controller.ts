import { Controller, Get, Post, Param, Body, Query, HttpCode, Logger } from '@nestjs/common';
import { TamService } from './tam.service';
import type { CreatePostDto, LogActionDto } from './tam.types';

const DEFAULT_TENANT = process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';

@Controller('tam')
export class TamController {
  private readonly logger = new Logger(TamController.name);
  constructor(private readonly service: TamService) {}

  @Get('health')
  health() { return { status: 'ok' }; }

  @Get('posts')
  async listPosts(
    @Query('tenantId') tenantId: string,
    @Query('category') category: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    return this.service.listPosts(tenant, category, pageNum, limitNum);
  }

  @Post('posts')
  @HttpCode(201)
  async createPost(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    return this.service.createPost(tenant, userId, dto);
  }

  @Get('posts/:id')
  async getPost(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    return this.service.getPost(id, tenant);
  }

  @Post('posts/:id/actions')
  @HttpCode(201)
  async logAction(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Body() dto: LogActionDto,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    return this.service.logAction(id, tenant, userId, dto);
  }

  @Get('posts/:id/actions')
  async getPostActions(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    return this.service.getPostActions(id, tenant);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('tenantId') tenantId: string,
    @Query('limit') limit: string,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    const limitNum = parseInt(limit, 10) || 10;
    return this.service.getLeaderboard(tenant, limitNum);
  }

  @Get('users/:userId/badges')
  async getUserBadges(
    @Param('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    return this.service.getUserBadges(userId, tenant);
  }

  @Get('users/:userId/points')
  async getUserPoints(
    @Param('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    return this.service.getUserPoints(userId, tenant);
  }
}
