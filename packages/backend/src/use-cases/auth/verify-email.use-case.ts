import crypto from 'crypto';

import { z } from 'zod';

import { DomainErrors, ok, err, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

/**
 * Verifies an email-verification token. The DB stores SHA-256 hashes of tokens,
 * not the raw values, so we hash the incoming token and look it up.
 */
export class VerifyEmailUseCase implements UseCase<VerifyEmailInput, { userId: string }> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ token }: VerifyEmailInput): Promise<Result<{ userId: string }>> {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { token: hashed, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {return err(DomainErrors.validation('Invalid or expired verification token'));}

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, status: 'active' as never },
      }),
    ]);

    return ok({ userId: record.userId });
  }
}
