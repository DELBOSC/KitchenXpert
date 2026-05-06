import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const UpdateUserStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['pending', 'active', 'suspended']),
});

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>;

/**
 * Admin-only: flip a user's status (suspend/reactivate). The middleware
 * authorising admin role is responsible for gating access; this use-case
 * only handles the persistence + audit.
 */
export class UpdateUserStatusUseCase implements UseCase<UpdateUserStatusInput, { ok: true }> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ userId, status }: UpdateUserStatusInput): Promise<Result<{ ok: true }>> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: status as never },
      });
      return ok({ ok: true });
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2025') return err(DomainErrors.notFound('User'));
      throw e;
    }
  }
}
