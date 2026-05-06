/**
 * Test environment defaults — runs via Jest `setupFiles` so it executes
 * BEFORE the test file imports any production module. This is required
 * because modules like jwt.service throw at construction time if their
 * env vars are missing, and `setupFilesAfterEnv` runs too late.
 *
 * These values are deliberately weak — they MUST never be reused outside
 * the test runtime.
 */

process.env.NODE_ENV ??= 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-at-least-32-chars-long-x';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-at-least-32-chars-long-y';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';
process.env.DATA_ENCRYPTION_KEY ??= 'test-data-encryption-key-32-chars-zzz';
process.env.STRIPE_SECRET_KEY ??= 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_test_dummy';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.APP_URL ??= 'http://localhost:3000';
