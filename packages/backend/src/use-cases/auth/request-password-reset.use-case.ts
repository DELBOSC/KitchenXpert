import crypto from 'crypto';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { ok, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const RequestPasswordResetSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase()),
});

export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
export interface RequestPasswordResetOutput {
  /** Raw token returned to the caller so it can be emailed; null when no user matched. */
  token: string | null;
  /** The user found (if any) — useful for the controller's mail step. */
  user: { id: string; email: string; firstName: string } | null;
}

const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Generates a password-reset token. Always returns ok({...}) so the controller
 * can answer with a generic "if an account exists" message — preventing email
 * enumeration. The token is stored hashed.
 */
export class RequestPasswordResetUseCase implements UseCase<RequestPasswordResetInput, RequestPasswordResetOutput> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ email }: RequestPasswordResetInput): Promise<Result<RequestPasswordResetOutput>> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true },
    });
    if (!user) return ok({ token: null, user: null });

    const raw = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: hashed, expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS) },
    });

    return ok({ token: raw, user });
  }
}
