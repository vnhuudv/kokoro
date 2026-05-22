# Slack OAuth + JWT Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Slack OAuth login into the dashboard and protect all Inochi endpoints with JWT authentication so every user sees only their own carbon data.

**Architecture:** The NestJS `AuthModule` (currently an empty stub) gains a `JwtAuthGuard`, a Slack OAuth redirect endpoint (`GET /auth/slack`), and a callback endpoint (`GET /auth/slack/callback`) that exchanges the OAuth code for a user's Slack ID, looks the user up in the `users` table, and issues a signed JWT. The React dashboard gains a login page, an auth callback route that stores the JWT in localStorage, and sends the token as a `Bearer` header on every API call. The Inochi controller drops `DEMO_USER_ID` and reads the real `user_id` from the verified JWT.

**Tech Stack:** `@nestjs/jwt` (already installed), Node 20 native `fetch`, NestJS `CanActivate` guard, React Router v6, `localStorage` for token storage.

---

## File Map

**New files:**
- `code/src/services/api-gateway/src/modules/auth/auth.types.ts` — `AuthUser` interface + Express Request augmentation
- `code/src/services/api-gateway/src/modules/auth/jwt.guard.ts` — `CanActivate` guard that validates Bearer JWT
- `code/src/web/dashboard/src/hooks/useAuth.ts` — token storage helpers + `useAuth` hook
- `code/src/web/dashboard/src/pages/LoginView.tsx` — "Sign in with Slack" page
- `code/src/web/dashboard/src/pages/AuthCallback.tsx` — reads `?token=` from URL and saves it

**Modified files:**
- `code/src/services/api-gateway/src/modules/auth/auth.service.ts` — Slack OAuth URL builder + code exchange + JWT issuance
- `code/src/services/api-gateway/src/modules/auth/auth.controller.ts` — OAuth redirect + callback endpoints
- `code/src/services/api-gateway/src/modules/auth/auth.module.ts` — register `JwtModule`, export `JwtAuthGuard`
- `code/src/services/api-gateway/src/modules/inochi/inochi.module.ts` — import `AuthModule` for guard
- `code/src/services/api-gateway/src/modules/inochi/inochi.controller.ts` — add guard, remove `DEMO_USER_ID`, fix timezone bug in `lastMonthFirstDay`
- `code/src/web/dashboard/src/hooks/useDashboard.ts` — attach `Authorization: Bearer` header to every fetch
- `code/src/web/dashboard/src/App.tsx` — add `/login` and `/auth/callback` routes, redirect unauthenticated users

**Test files:**
- `code/tests/auth/jwt.guard.spec.ts`
- `code/tests/auth/auth.service.spec.ts`

---

## Task 1: JWT Auth Types + Guard

**Files:**
- Create: `code/src/services/api-gateway/src/modules/auth/auth.types.ts`
- Create: `code/src/services/api-gateway/src/modules/auth/jwt.guard.ts`
- Modify: `code/src/services/api-gateway/src/modules/auth/auth.module.ts`
- Test: `code/tests/auth/jwt.guard.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `code/tests/auth/jwt.guard.spec.ts`:

```typescript
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

// Import guard once it exists
// import { JwtAuthGuard } from '../../src/services/api-gateway/src/modules/auth/jwt.guard';

describe('JwtAuthGuard', () => {
  const SECRET = 'test-secret';
  const jwtService = new JwtService({ secret: SECRET });

  function makeGuard() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { JwtAuthGuard } = require('../../src/services/api-gateway/src/modules/auth/jwt.guard');
    return new JwtAuthGuard(jwtService);
  }

  function makeContext(authHeader?: string) {
    const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
    return {
      switchToHttp: () => ({ getRequest: () => req }),
    } as any;
  }

  it('allows request with valid token and attaches user to request', () => {
    const payload = { user_id: 'u1', tenant_id: 't1', slack_user_id: 'SLACK1' };
    const token = jwtService.sign(payload, { secret: SECRET });
    const ctx = makeContext(`Bearer ${token}`);
    const guard = makeGuard();
    expect(guard.canActivate(ctx)).toBe(true);
    const req = ctx.switchToHttp().getRequest();
    expect(req.user.user_id).toBe('u1');
    expect(req.user.tenant_id).toBe('t1');
  });

  it('throws UnauthorizedException when no Authorization header', () => {
    const guard = makeGuard();
    expect(() => guard.canActivate(makeContext())).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for malformed token', () => {
    const guard = makeGuard();
    expect(() => guard.canActivate(makeContext('Bearer not-a-valid-jwt'))).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for token signed with wrong secret', () => {
    const wrongService = new JwtService({ secret: 'wrong-secret' });
    const token = wrongService.sign({ user_id: 'u1' });
    const guard = makeGuard();
    expect(() => guard.canActivate(makeContext(`Bearer ${token}`))).toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/leodo/Documents/Claude/kokoro/code
npx jest tests/auth/jwt.guard.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create auth.types.ts**

Create `code/src/services/api-gateway/src/modules/auth/auth.types.ts`:

```typescript
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
```

- [ ] **Step 4: Create jwt.guard.ts**

Create `code/src/services/api-gateway/src/modules/auth/jwt.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthUser } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      req.user = this.jwtService.verify<AuthUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
    return null;
  }
}
```

- [ ] **Step 5: Update auth.module.ts to register JwtModule and export the guard**

Replace `code/src/services/api-gateway/src/modules/auth/auth.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-me-in-production',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd /Users/leodo/Documents/Claude/kokoro/code
npx jest tests/auth/jwt.guard.spec.ts --no-coverage 2>&1 | tail -15
```

Expected: 4 passed.

- [ ] **Step 7: Compile check**

```bash
cd /Users/leodo/Documents/Claude/kokoro/code/src/services/api-gateway
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/leodo/Documents/Claude/kokoro
git add code/src/services/api-gateway/src/modules/auth/auth.types.ts
git add code/src/services/api-gateway/src/modules/auth/jwt.guard.ts
git add code/src/services/api-gateway/src/modules/auth/auth.module.ts
git add code/tests/auth/jwt.guard.spec.ts
git commit -m "feat(auth): add JWT guard and wire JwtModule into AuthModule"
```

---

## Task 2: Slack OAuth Endpoints

**Files:**
- Modify: `code/src/services/api-gateway/src/modules/auth/auth.service.ts`
- Modify: `code/src/services/api-gateway/src/modules/auth/auth.controller.ts`
- Modify: `code/.env.example`
- Test: `code/tests/auth/auth.service.spec.ts`

New env vars needed: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_OAUTH_REDIRECT_URI`, `DASHBOARD_URL`.

- [ ] **Step 1: Write the failing test**

Create `code/tests/auth/auth.service.spec.ts`:

```typescript
describe('AuthService.slackOAuthUrl', () => {
  beforeEach(() => {
    process.env.SLACK_CLIENT_ID = 'test-client-id';
    process.env.SLACK_OAUTH_REDIRECT_URI = 'http://localhost:3000/api/auth/slack/callback';
  });

  it('returns a Slack authorize URL with correct params', () => {
    const { AuthService } = require('../../src/services/api-gateway/src/modules/auth/auth.service');
    const service = new AuthService(null as any, null as any);
    const url = service.slackOAuthUrl();
    expect(url).toContain('https://slack.com/oauth/v2/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('user_scope=identity.basic');
    expect(url).toContain('redirect_uri=');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/leodo/Documents/Claude/kokoro/code
npx jest tests/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement auth.service.ts**

Replace `code/src/services/api-gateway/src/modules/auth/auth.service.ts` with:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { AuthUser } from './auth.types';

const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL     = 'https://slack.com/api/oauth.v2.access';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(DB_POOL) private readonly pool: Pool,
  ) {}

  slackOAuthUrl(): string {
    const params = new URLSearchParams({
      client_id:    process.env.SLACK_CLIENT_ID    ?? '',
      user_scope:   'identity.basic',
      redirect_uri: process.env.SLACK_OAUTH_REDIRECT_URI ?? '',
    });
    return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCodeForJwt(code: string): Promise<string> {
    const body = new URLSearchParams({
      code,
      client_id:     process.env.SLACK_CLIENT_ID     ?? '',
      client_secret: process.env.SLACK_CLIENT_SECRET ?? '',
      redirect_uri:  process.env.SLACK_OAUTH_REDIRECT_URI ?? '',
    });

    const res = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json() as {
      ok: boolean;
      authed_user?: { id: string };
      error?: string;
    };

    if (!data.ok || !data.authed_user?.id) {
      throw new Error(`Slack OAuth failed: ${data.error ?? 'unknown_error'}`);
    }

    const slackUserId = data.authed_user.id;

    const { rows } = await this.pool.query<{ user_id: string; tenant_id: string }>(
      `SELECT user_id, tenant_id FROM users
       WHERE slack_user_id = $1 AND opted_out_at IS NULL
       LIMIT 1`,
      [slackUserId],
    );

    if (rows.length === 0) {
      throw new Error(`No active user found for Slack ID ${slackUserId}`);
    }

    const payload: AuthUser = {
      user_id:       rows[0].user_id,
      tenant_id:     rows[0].tenant_id,
      slack_user_id: slackUserId,
    };

    return this.jwtService.sign(payload);
  }
}
```

- [ ] **Step 4: Implement auth.controller.ts**

Replace `code/src/services/api-gateway/src/modules/auth/auth.controller.ts` with:

```typescript
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
```

- [ ] **Step 5: Add new env vars to .env.example**

Open `code/.env.example` and add after the existing Slack section:

```
SLACK_CLIENT_ID=your-slack-app-client-id
SLACK_CLIENT_SECRET=your-slack-app-client-secret
SLACK_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/slack/callback
DASHBOARD_URL=http://localhost:5173
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd /Users/leodo/Documents/Claude/kokoro/code
npx jest tests/auth/auth.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: 1 passed.

- [ ] **Step 7: Compile check**

```bash
cd /Users/leodo/Documents/Claude/kokoro/code/src/services/api-gateway
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/leodo/Documents/Claude/kokoro
git add code/src/services/api-gateway/src/modules/auth/auth.service.ts
git add code/src/services/api-gateway/src/modules/auth/auth.controller.ts
git add code/.env.example
git add code/tests/auth/auth.service.spec.ts
git commit -m "feat(auth): Slack OAuth redirect + callback, JWT issuance"
```

---

## Task 3: Wire Auth onto Inochi Endpoints

**Files:**
- Modify: `code/src/services/api-gateway/src/modules/inochi/inochi.module.ts`
- Modify: `code/src/services/api-gateway/src/modules/inochi/inochi.controller.ts`

The Inochi controller currently uses `DEMO_USER_ID` and accepts `user_id` as an open query param. This task replaces that with the real authenticated user from the JWT. It also fixes a timezone bug in `lastMonthFirstDay()` (uses local date math, should use UTC).

- [ ] **Step 1: Import AuthModule into InochiModule**

Replace `code/src/services/api-gateway/src/modules/inochi/inochi.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InochiController } from './inochi.controller';
import { InochiService } from './inochi.service';
import { InochiSyncJob } from './inochi-sync.job';

@Module({
  imports: [AuthModule],
  controllers: [InochiController],
  providers: [InochiService, InochiSyncJob],
  exports: [InochiService],
})
export class InochiModule {}
```

- [ ] **Step 2: Update inochi.controller.ts to use JwtAuthGuard**

Replace `code/src/services/api-gateway/src/modules/inochi/inochi.controller.ts` with:

```typescript
import { Controller, Get, Post, Body, Query, HttpCode, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { InochiService } from './inochi.service';
import { InochiSyncJob } from './inochi-sync.job';
import { CreateOffsetDto } from './inochi.types';

function currentMonthUTC(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastMonthFirstDayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 10);
}

@UseGuards(JwtAuthGuard)
@Controller('inochi')
export class InochiController {
  constructor(
    private readonly inochiService: InochiService,
    private readonly syncJob: InochiSyncJob,
  ) {}

  @Get('carbon/me')
  getPersonalCarbon(
    @Req() req: Request,
    @Query('month') month = currentMonthUTC(),
  ) {
    return this.inochiService.getPersonalCarbon(req.user!.user_id, month);
  }

  @Get('carbon/me/history')
  getPersonalHistory(@Req() req: Request) {
    return this.inochiService.getPersonalHistory(req.user!.user_id);
  }

  @Get('carbon/company')
  getCompanyCarbon(@Query('month') month = currentMonthUTC()) {
    return this.inochiService.getCompanyCarbon(month);
  }

  @Get('offsets')
  listOffsets() {
    return this.inochiService.listOffsets();
  }

  @Post('offsets')
  @HttpCode(201)
  createOffset(@Body() dto: CreateOffsetDto, @Req() req: Request) {
    return this.inochiService.createOffset(dto, req.user!.user_id);
  }

  @Post('sync')
  @HttpCode(200)
  async triggerSync() {
    const periodDate = lastMonthFirstDayUTC();
    try {
      const result = await this.syncJob.syncEstimates(periodDate);
      return { ok: true, period: periodDate, ...result };
    } catch (err) {
      return { ok: false, period: periodDate, error: String(err) };
    }
  }
}
```

- [ ] **Step 3: Compile check**

```bash
cd /Users/leodo/Documents/Claude/kokoro/code/src/services/api-gateway
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/leodo/Documents/Claude/kokoro
git add code/src/services/api-gateway/src/modules/inochi/inochi.module.ts
git add code/src/services/api-gateway/src/modules/inochi/inochi.controller.ts
git commit -m "feat(inochi): protect all endpoints with JwtAuthGuard, read user from JWT"
```

---

## Task 4: Frontend Auth

**Files:**
- Create: `code/src/web/dashboard/src/hooks/useAuth.ts`
- Create: `code/src/web/dashboard/src/pages/LoginView.tsx`
- Create: `code/src/web/dashboard/src/pages/AuthCallback.tsx`
- Modify: `code/src/web/dashboard/src/hooks/useDashboard.ts`
- Modify: `code/src/web/dashboard/src/App.tsx`

The dashboard needs to:
1. Show a login page if the user has no token
2. Handle the OAuth callback (`/auth/callback?token=...`) by saving the token to localStorage
3. Send the token as `Authorization: Bearer ...` on every API call

- [ ] **Step 1: Create useAuth.ts**

Create `code/src/web/dashboard/src/hooks/useAuth.ts`:

```typescript
const TOKEN_KEY = 'kokoro_jwt';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function useAuth() {
  const token = getToken();
  return {
    isAuthenticated: !!token,
    logout() {
      clearToken();
      window.location.href = '/login';
    },
  };
}
```

- [ ] **Step 2: Create LoginView.tsx**

Create `code/src/web/dashboard/src/pages/LoginView.tsx`:

```tsx
const API_BASE = 'http://localhost:3000/api';

export function LoginView() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  return (
    <main style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', background: '#f8fafc',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '48px 56px',
        boxShadow: '0 4px 24px rgba(0,0,0,.08)', textAlign: 'center', maxWidth: 400,
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>心</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          Sign in to Kokoro
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 14, color: '#64748b' }}>
          Use your Vnext Slack account
        </p>
        {error && (
          <div style={{ color: '#ef4444', marginBottom: 16, fontSize: 13 }}>
            Authentication failed. Please try again.
          </div>
        )}
        <a
          href={`${API_BASE}/auth/slack`}
          style={{
            display: 'inline-block', background: '#4A154B', color: '#fff',
            borderRadius: 8, padding: '12px 28px', fontWeight: 600,
            fontSize: 15, textDecoration: 'none',
          }}
        >
          Sign in with Slack
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create AuthCallback.tsx**

Create `code/src/web/dashboard/src/pages/AuthCallback.tsx`:

```tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveToken } from '../hooks/useAuth';

export function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      saveToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, []);

  return (
    <div style={{ padding: 40, color: '#64748b', textAlign: 'center' }}>
      Signing in…
    </div>
  );
}
```

- [ ] **Step 4: Update useDashboard.ts to send Authorization header**

Replace `code/src/web/dashboard/src/hooks/useDashboard.ts` with:

```typescript
import { useEffect, useState } from 'react';
import { getToken } from './useAuth';

const API_BASES: Record<string, string> = {
  dashboard: 'http://localhost:3000/api/dashboard',
  inochi:    'http://localhost:3000/api/inochi',
};

function makeUseFetch(base: string) {
  return function useFetch<T>(path: string) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch(`${base}${path}`, { headers })
        .then(r => {
          if (r.status === 401) throw new Error('Unauthorized');
          return r.json();
        })
        .then(setData)
        .catch(e => setError(String(e)))
        .finally(() => setLoading(false));
    }, [path]);

    return { data, loading, error };
  };
}

export const useFetch = makeUseFetch(API_BASES.dashboard);
export const useInochiFetch = makeUseFetch(API_BASES.inochi);
```

- [ ] **Step 5: Update App.tsx to add auth routes and redirect**

Replace `code/src/web/dashboard/src/App.tsx` with:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Nav } from './components/Nav';
import { TeamView } from './pages/TeamView';
import { PersonalView } from './pages/PersonalView';
import { PublicView } from './pages/PublicView';
import { CarbonView } from './pages/CarbonView';
import { AdminCarbonView } from './pages/AdminCarbonView';
import { LoginView } from './pages/LoginView';
import { AuthCallback } from './pages/AuthCallback';
import { useAuth } from './hooks/useAuth';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Routes>
        <Route path="/login"         element={<LoginView />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={
          <RequireAuth>
            <Nav />
            <Routes>
              <Route path="/"             element={<TeamView />} />
              <Route path="/me"           element={<PersonalView />} />
              <Route path="/public"       element={<PublicView />} />
              <Route path="/carbon"       element={<CarbonView />} />
              <Route path="/admin/carbon" element={<AdminCarbonView />} />
            </Routes>
          </RequireAuth>
        } />
      </Routes>
    </div>
  );
}
```

- [ ] **Step 6: Verify dashboard builds**

```bash
cd /Users/leodo/Documents/Claude/kokoro/code/src/web/dashboard
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/leodo/Documents/Claude/kokoro
git add code/src/web/dashboard/src/hooks/useAuth.ts
git add code/src/web/dashboard/src/pages/LoginView.tsx
git add code/src/web/dashboard/src/pages/AuthCallback.tsx
git add code/src/web/dashboard/src/hooks/useDashboard.ts
git add code/src/web/dashboard/src/App.tsx
git commit -m "feat(dashboard): Slack OAuth login, JWT token storage, protected routes"
```

---

## Self-Review

**Spec coverage:**
- JwtAuthGuard validates Bearer token → Task 1 ✓
- `GET /auth/slack` redirects to Slack OAuth → Task 2 ✓
- `GET /auth/slack/callback` exchanges code, issues JWT, redirects dashboard → Task 2 ✓
- All Inochi endpoints protected by guard → Task 3 ✓
- `DEMO_USER_ID` removed, real `user_id` from JWT used → Task 3 ✓
- `lastMonthFirstDay()` timezone bug fixed → Task 3 ✓
- Login page with "Sign in with Slack" link → Task 4 ✓
- Auth callback page stores JWT → Task 4 ✓
- Unauthenticated users redirected to `/login` → Task 4 ✓
- All API fetches send `Authorization: Bearer` header → Task 4 ✓
- New env vars documented in `.env.example` → Task 2 ✓

**Note:** The `dashboard` API (`/api/dashboard/*`) and `annotation` endpoints (`/api/annotations/*`) are not guarded by this plan — only the Inochi module is in scope. Those routes already work without auth in the pilot and are unchanged.
