/**
 * Token revocation on compliance routes — the negative control for the auth-dup fix.
 *
 * compliance-routes used to import a DUPLICATE auth-middleware (src/middleware/) that
 * called jwt.verify raw, with ZERO blacklist checks. Effect: a REVOKED token — logout,
 * password change, security-event blacklist — kept working on every compliance endpoint.
 * The real middleware (src/api/middleware/) has 12 blacklist checks; the duplicate had 0.
 * A single import path (`../../` vs `../`) disarmed token revocation.
 *
 * The proof that matters is NOT "compliance still answers" — it is: a BLACKLISTED token,
 * which PASSED through the old duplicate, is now REJECTED by the real middleware that
 * compliance-routes now uses. So we exercise the REAL authenticate directly with a
 * revoked token, and assert it is refused.
 */
import fs from 'fs';
import path from 'path';

const mockIsBlacklisted = jest.fn();
const mockIsUserBlacklisted = jest.fn();
jest.mock('../auth/token-blacklist', () => ({
  getTokenBlacklist: () => ({
    isBlacklisted: (...a: unknown[]) => mockIsBlacklisted(...a),
    isUserBlacklisted: (...a: unknown[]) => mockIsUserBlacklisted(...a),
  }),
  getTokenIssuedAt: () => 1_000,
}));

const mockVerify = jest.fn();
jest.mock('../auth/jwt.service', () => ({
  jwtService: { verifyAccessToken: (...a: unknown[]) => mockVerify(...a) },
}));

// eslint-disable-next-line import/first
import { authenticate } from '../api/middleware/auth-middleware';

function ctx(token = 'tok') {
  const req = { cookies: { accessToken: token }, headers: {} } as never;
  const res = {} as never;
  const next = jest.fn();
  return { req, res, next };
}

describe('token revocation is enforced by the middleware compliance-routes now uses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockReturnValue({ userId: 'u1', email: 'a@b.c', role: 'user' });
    mockIsBlacklisted.mockResolvedValue(false);
    mockIsUserBlacklisted.mockResolvedValue(false);
  });

  it('accepts a valid, non-revoked token (drop-in: normal auth still works)', async () => {
    const { req, res, next } = ctx();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(); // next() with no error
    expect((req as { user?: unknown }).user).toEqual({
      userId: 'u1',
      email: 'a@b.c',
      role: 'user',
    });
  });

  it('🔒 REJECTS a directly-blacklisted token (was: accepted by the deleted duplicate)', async () => {
    mockIsBlacklisted.mockResolvedValue(true); // token was revoked (e.g. logout)
    const { req, res, next } = ctx();
    await authenticate(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(401); // UnauthorizedError → 401 via the error handler
    expect((req as { user?: unknown }).user).toBeUndefined();
  });

  it('🔒 REJECTS a token revoked by a security event (user-level blacklist)', async () => {
    mockIsUserBlacklisted.mockResolvedValue(true); // e.g. password change
    const { req, res, next } = ctx();
    await authenticate(req, res, next);
    expect(next.mock.calls[0][0]?.statusCode).toBe(401);
  });
});

describe('the duplicate is gone and compliance points at the real middleware', () => {
  it('src/middleware/auth-middleware.ts no longer exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../middleware/auth-middleware.ts'))).toBe(false);
  });

  it('compliance-routes imports auth from ../middleware (→ the real src/api/middleware)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../api/routes/compliance-routes.ts'),
      'utf8'
    );
    expect(src).toMatch(/from '\.\.\/middleware\/auth-middleware'/);
    expect(src).not.toMatch(/from '\.\.\/\.\.\/middleware\/auth-middleware'/);
  });
});
