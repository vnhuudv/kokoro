import { Controller, Get, Query } from '@nestjs/common';
import { UsersService, CachedProfile } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('profiles')
  async getProfiles(
    @Query('slackIds') slackIds?: string,
  ): Promise<CachedProfile[]> {
    if (!slackIds) return [];
    const ids = slackIds.split(',').map(id => id.trim()).filter(Boolean);
    return this.usersService.getProfilesBySlackIds(ids);
  }
}
