import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

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
