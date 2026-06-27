import crypto from 'crypto';

import bcrypt from 'bcrypt';
import { z } from 'zod';

import { jwtService } from '../../auth/jwt.service';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import { TOKEN_EXPIRATION } from '../../services/email-token.service';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

/**
 * Registers a new user atomically:
 *   1. verify email is free
 *   2. hash password
 *   3. create user + issue verification token in a single DB transaction
 *   4. sign JWT pair
 *
 * This is the reference implementation for the use-case pattern. New
 * endpoints should follow the same shape (Zod schema + UseCase + runUseCase
 * adapter) so controllers stay thin and business logic is unit-testable
 * without Express.
 */

export const RegisterSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(200),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  language: z.string().length(2).optional(),
  timezone: z.string().max(64).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export interface RegisterOutput {
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
  tokens: { accessToken: string; refreshToken: string; expiresIn: number; tokenType: string };
  verificationToken: string;
}

const SALT_ROUNDS = 12;
const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export class RegisterUseCase implements UseCase<RegisterInput, RegisterOutput> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: RegisterInput): Promise<Result<RegisterOutput>> {
    if (!PASSWORD_COMPLEXITY.test(input.password)) {
      return err(
        DomainErrors.validation('Password must contain uppercase, lowercase and a digit', [
          { path: 'password', message: 'complexity' },
        ])
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return err(DomainErrors.conflict('Email already registered', 'EMAIL_TAKEN'));
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRATION.EMAIL_VERIFICATION);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          role: 'user',
          status: 'pending' as never,
          emailVerified: false,
          language: input.language || 'fr',
          timezone: input.timezone || 'UTC',
        },
      });
      await tx.emailVerificationToken.create({
        data: { userId: created.id, token: hashedToken, expiresAt: tokenExpiresAt },
      });
      return created;
    });

    const tokens = jwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role as never,
    });

    return ok({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
      verificationToken: rawToken,
    });
  }
}
