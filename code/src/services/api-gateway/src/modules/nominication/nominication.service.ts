import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import type { CreateSessionDto, NomicationSession, NomicationNudge } from './nominication.types';

@Injectable()
export class NomicationService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async createSession(_tenantId: string, _initiatorSlackUserId: string, _dto: CreateSessionDto): Promise<NomicationSession> {
    throw new Error('not implemented');
  }

  async getSession(_id: string, _tenantId: string): Promise<NomicationSession> {
    throw new Error('not implemented');
  }

  async markAttendance(_sessionId: string, _tenantId: string, _slackUserId: string): Promise<void> {
    throw new Error('not implemented');
  }

  async getPendingNudges(_tenantId: string): Promise<NomicationNudge[]> {
    throw new Error('not implemented');
  }

  async updateNudgeStatus(_id: string, _tenantId: string, _status: string): Promise<void> {
    throw new Error('not implemented');
  }
}
