import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const ConfirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, '8 caractères minimum')
    .max(200)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/\d/),
});

export type ConfirmPasswordResetInput = z.infer<typeof ConfirmPasswordResetSchema>;

const SALT_ROUNDS = 12;

export class ConfirmPasswordResetUseCase implements UseCase<ConfirmPasswordResetInput, { userId: string }> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ token, newPassword }: ConfirmPasswordResetInput): Promise<Result<{ userId: string }>> {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { token: hashed, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) return err(DomainErrors.validation('Invalid or expired reset token'));

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { password: passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Invalidate all other reset tokens to force re-issuance after a successful reset.
      this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return ok({ userId: record.userId });
  }
}
