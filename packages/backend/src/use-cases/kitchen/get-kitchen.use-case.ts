import { z } from 'zod';

import { DomainErrors, ok, err, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const GetKitchenSchema = z.object({
  kitchenId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().optional(),
});

export type GetKitchenInput = z.infer<typeof GetKitchenSchema>;

export class GetKitchenUseCase implements UseCase<GetKitchenInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ kitchenId, userId, role }: GetKitchenInput): Promise<Result<unknown>> {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { id: kitchenId, deletedAt: null },
      include: {
        configuration: true,
        items: { include: { product: true, appliance: true } },
        project: { select: { id: true, name: true, userId: true } },
      },
    });
    if (!kitchen) {
      return err(DomainErrors.notFound('Kitchen'));
    }
    // Ownership: admins always pass; otherwise the kitchen must belong to the caller.
    if (kitchen.userId !== userId && role !== 'admin') {
      return err(DomainErrors.forbidden('You do not have access to this kitchen'));
    }
    return ok(kitchen);
  }
}
