import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { MakotoService } from './makoto.service';
import type { CreatePostDto, AddCommentDto } from './makoto.types';

const DEFAULT_TENANT = process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';

@Controller('makoto')
export class MakotoController {
  private readonly logger = new Logger(MakotoController.name);
  constructor(private readonly service: MakotoService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('posts')
  async listPosts(
    @Query('tenantId') tenantId: string,
    @Query('type') type: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    return this.service.listPosts(tenant, type || undefined, pageNum, limitNum);
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

  @Get('posts/:id/comments')
  async getComments(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    return this.service.getComments(id, tenant);
  }

  @Post('posts/:id/comments')
  @HttpCode(201)
  async addComment(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Body() dto: AddCommentDto,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    return this.service.addComment(id, tenant, userId, dto);
  }

  @Delete('comments/:commentId')
  @HttpCode(204)
  async deleteComment(
    @Param('commentId') commentId: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
  ) {
    await this.service.deleteComment(commentId, tenantId ?? DEFAULT_TENANT, userId);
  }

  @Post('posts/:id/reactions')
  async toggleReaction(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
  ) {
    const tenant = tenantId ?? DEFAULT_TENANT;
    return this.service.toggleReaction(id, tenant, userId);
  }
}
