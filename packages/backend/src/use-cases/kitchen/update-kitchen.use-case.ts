import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const UpdateKitchenSchema = z.object({
  kitchenId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().optional(),
  patch: z.object({
    name: z.string().min(1).max(120).optional(),
    style: z.string().max(40).optional(),
    layout: z.string().max(40).optional(),
    width: z.number().positive().optional(),
    length: z.number().positive().optional(),
    height: z.number().positive().optional(),
    isGenerated: z.boolean().optional(),
    score: z.number().min(0).max(100).optional(),
    thumbnail: z.string().url().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type UpdateKitchenInput = z.infer<typeof UpdateKitchenSchema>;

export class UpdateKitchenUseCase implements UseCase<UpdateKitchenInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ kitchenId, userId, role, patch }: UpdateKitchenInput): Promise<Result<unknown>> {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { id: kitchenId, deletedAt: null },
      select: { userId: true },
    });
    if (!kitchen) return err(DomainErrors.notFound('Kitchen'));
    if (kitchen.userId !== userId && role !== 'admin') {
      return err(DomainErrors.forbidden('You do not have access to this kitchen'));
    }

    const updated = await this.prisma.kitchen.update({
      where: { id: kitchenId },
      data: patch as never,
      include: { configuration: true },
    });
    return ok(updated);
  }
}
