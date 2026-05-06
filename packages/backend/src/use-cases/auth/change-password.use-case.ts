import bcrypt from 'bcrypt';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const ChangePasswordSchema = z.object({
  userId: z.string().uuid(),
  currentPassword: z.string().min(1).max(200),
  newPassword: z
    .string()
    .min(8, '8 caractères minimum')
    .max(200)
    .regex(/[A-Z]/, 'Doit contenir une majuscule')
    .regex(/[a-z]/, 'Doit contenir une minuscule')
    .regex(/\d/, 'Doit contenir un chiffre'),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

const SALT_ROUNDS = 12;

export class ChangePasswordUseCase implements UseCase<ChangePasswordInput, { ok: true }> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ userId, currentPassword, newPassword }: ChangePasswordInput): Promise<Result<{ ok: true }>> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return err(DomainErrors.notFound('User'));

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return err(DomainErrors.unauthorized('Current password is incorrect'));

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return ok({ ok: true });
  }
}
