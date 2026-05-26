// code/src/services/api-gateway/src/modules/tam/tam.types.ts

export type TamCategory = 'climate' | 'poverty' | 'disaster' | 'other';
export type TamActionType = 'donation' | 'volunteer' | 'pledge';
export type TamSource = 'user' | 'system';

export interface CreatePostDto {
  title: string;
  description: string;
  coverImageUrl?: string;
  externalUrl?: string;
  category: TamCategory;
  source?: TamSource;
}

export interface LogActionDto {
  actionType: TamActionType;
  externalUrlClicked?: boolean;
  amountLogged?: number;
  hoursLogged?: number;
  note?: string;
}

export interface TamPost {
  id: string;
  tenantId: string;
  authorUserId: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  externalUrl?: string;
  source: TamSource;
  category: TamCategory;
  createdAt: Date;
  updatedAt: Date;
  actionCount: number;
  totalPoints: number;
}

export interface TamAction {
  id: string;
  tenantId: string;
  postId: string;
  userId: string;
  actionType: TamActionType;
  externalUrlClicked: boolean;
  amountLogged?: number;
  hoursLogged?: number;
  note?: string;
  createdAt: Date;
}

export interface TamBadge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  thresholdPoints: number;
  categoryFilter?: TamCategory;
}

export interface TamUserBadge {
  id: string;
  tenantId: string;
  userId: string;
  badge: TamBadge;
  awardedAt: Date;
}

export interface TamLeaderboardEntry {
  userId: string;
  totalPoints: number;
  badgeCount: number;
}

export interface TamUserPoints {
  userId: string;
  totalPoints: number;
}
