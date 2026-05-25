export type TriggerType = 'manual' | 'ai_nudged';
export type SessionStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type NudgeStatus = 'pending' | 'sent' | 'accepted' | 'dismissed' | 'expired';

export interface CreateSessionDto {
  channelId: string;
  scheduledAt?: string;    // ISO date string
  venue?: string;
  beerAppGroupId?: string;
  triggerType?: TriggerType;
  nudgeId?: string;
}

export interface NominicationSession {
  id: string;
  tenantId: string;
  channelId: string;
  initiatorSlackUserId: string;
  beerAppGroupId?: string;
  triggerType: TriggerType;
  nudgeId?: string;
  scheduledAt?: Date;
  status: SessionStatus;
  venue?: string;
  createdAt: Date;
}

export interface NominicationNudge {
  id: string;
  tenantId: string;
  channelId: string;
  targetSlackUserId: string;
  reason: string;
  frictionScore?: number;
  status: NudgeStatus;
  createdAt: Date;
  respondedAt?: Date;
}
