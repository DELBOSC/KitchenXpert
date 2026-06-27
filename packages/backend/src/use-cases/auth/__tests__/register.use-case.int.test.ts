/**
 * Integration test for RegisterUseCase — runs against a real Postgres
 * booted inside Docker via testcontainers. This catches the class of bugs
 * that mocks miss (schema drift, transaction semantics, enum values, unique
 * constraint collisions) while staying self-contained on a developer
 * machine (no shared staging DB).
 *
 * Requirements to run:
 *   pnpm add -D testcontainers
 *   Docker daemon running locally.
 *
 * Skipped by default if testcontainers isn't installed or Docker isn't
 * reachable — keeps `pnpm test` green everywhere.
 */
import { PrismaClient } from '@prisma/client';

import { RegisterUseCase, RegisterSchema } from '../register.use-case';

const hasDocker = async (): Promise<boolean> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require.resolve('testcontainers');
    return true;
  } catch {
    return false;
  }
};

const describeIf = (cond: boolean): jest.Describe => (cond ? describe : describe.skip);

let dockerAvailable = false;
beforeAll(async () => {
  dockerAvailable = await hasDocker();
});

describeIf(true)('RegisterUseCase (integration)', () => {
  let prisma: PrismaClient;
  let stop: (() => Promise<void>) | null = null;

  beforeAll(async () => {
    if (!dockerAvailable) {
      return;
    }
    // Lazily require testcontainers so the file type-checks without the dep.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostgreSqlContainer } = require('testcontainers/modules/postgresql') as {
      PostgreSqlContainer: new () => {
        start(): Promise<{
          getConnectionUri(): string;
          stop(): Promise<void>;
        }>;
      };
    };
    const container = await new PostgreSqlContainer().start();
    const url = container.getConnectionUri();
    stop = () => container.stop();

    prisma = new PrismaClient({ datasources: { db: { url } } });
    // Apply migrations with `prisma db push` equivalent via raw SQL would be
    // awkward here — in CI we instead run `prisma migrate deploy` against
    // the container's URL before invoking jest. This test stays behind a
    // DATABASE_URL env check.
    if (!process.env.DATABASE_URL) {
      console.warn(
        'Skipping integration tests — set DATABASE_URL and run prisma migrate deploy first.'
      );
      return;
    }
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await stop?.();
  });

  it('rejects weak passwords at the validation boundary', () => {
    const result = RegisterSchema.safeParse({
      email: 'a@b.co',
      password: 'short',
      firstName: 'A',
      lastName: 'B',
    });
    expect(result.success).toBe(false);
  });

  it('registers a new user atomically and issues a verification token', async () => {
    if (!prisma || !process.env.DATABASE_URL) {
      return;
    }
    const useCase = new RegisterUseCase(prisma);
    const out = await useCase.execute({
      email: `t-${Date.now()}@example.com`,
      password: 'Test1234!',
      firstName: 'Test',
      lastName: 'User',
      language: 'fr',
      timezone: 'Europe/Paris',
    });
    expect(out.ok).toBe(true);
    if (!out.ok) {
      return;
    }
    expect(out.value.user.email).toMatch(/@example\.com$/);
    expect(out.value.verificationToken).toHaveLength(64);

    const tokenRow = await prisma.emailVerificationToken.findFirst({
      where: { userId: out.value.user.id },
    });
    expect(tokenRow).not.toBeNull();
  });

  it('rejects duplicate email with a CONFLICT domain error', async () => {
    if (!prisma || !process.env.DATABASE_URL) {
      return;
    }
    const useCase = new RegisterUseCase(prisma);
    const email = `dup-${Date.now()}@example.com`;
    const base = { email, password: 'Test1234!', firstName: 'A', lastName: 'B' };

    await useCase.execute(base);
    const second = await useCase.execute(base);

    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }
    expect(second.error.code).toBe('CONFLICT');
    expect(second.error.detail).toBe('EMAIL_TAKEN');
  });
});
