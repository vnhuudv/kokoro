export type MakotoPostType = 'official' | 'article';
export type MakotoReactionType = 'like';

export interface CreatePostDto {
  title: string;
  body: string;
  postType: MakotoPostType;
  metricRefs?: string[];
}

export interface AddCommentDto {
  body: string;
  parentId?: string;
}

export interface MakotoPost {
  id: string;
  tenantId: string;
  authorUserId: string;
  title: string;
  body: string;
  postType: MakotoPostType;
  metricRefs: string[] | null;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
}

export interface MakotoComment {
  id: string;
  tenantId: string;
  postId: string;
  parentId: string | null;
  authorUserId: string;
  body: string;
  createdAt: Date;
  replies: MakotoComment[];
}

export interface MakotoReactionResult {
  liked: boolean;
  count: number;
}
