export interface AuthUser {
  user_id: string;
  tenant_id: string;
  slack_user_id: string;
}

declare module 'express' {
  interface Request {
    user?: AuthUser;
  }
}
