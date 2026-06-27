import { z } from 'zod';

import { DomainErrors, ok, err, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const DeleteKitchenSchema = z.object({
  kitchenId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().optional(),
});

export type DeleteKitchenInput = z.infer<typeof DeleteKitchenSchema>;

/**
 * Soft-delete only — sets deletedAt. The hard-delete is reserved for the
 * RGPD erasure flow (see use-cases/gdpr/...) where it's tied to legal retention.
 */
export class DeleteKitchenUseCase implements UseCase<DeleteKitchenInput, { ok: true }> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ kitchenId, userId, role }: DeleteKitchenInput): Promise<Result<{ ok: true }>> {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { id: kitchenId, deletedAt: null },
      select: { userId: true },
    });
    if (!kitchen) {
      return err(DomainErrors.notFound('Kitchen'));
    }
    if (kitchen.userId !== userId && role !== 'admin') {
      return err(DomainErrors.forbidden('You do not have access to this kitchen'));
    }
    await this.prisma.kitchen.update({ where: { id: kitchenId }, data: { deletedAt: new Date() } });
    return ok({ ok: true });
  }
}
