import crypto from 'crypto';

import { z } from 'zod';

import { DomainErrors, ok, err, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const CreateOrderSchema = z.object({
  userId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    applianceId: z.string().uuid().optional(),
    name: z.string().min(1).max(200),
    sku: z.string().max(80).optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export class CreateOrderUseCase implements UseCase<CreateOrderInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateOrderInput): Promise<Result<unknown>> {
    if (input.projectId) {
      // Authorisation: project must belong to the user.
      const project = await this.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { userId: true },
      });
      if (!project) {return err(DomainErrors.notFound('Project'));}
      if (project.userId !== input.userId) {return err(DomainErrors.forbidden('Project not owned'));}
    }

    const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    // Order number is human-readable + globally unique. Random suffix avoids
    // collisions without a dedicated sequence table.
    const orderNumber = `ORD-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        userId: input.userId,
        projectId: input.projectId ?? null,
        orderNumber,
        status: 'pending' as never,
        subtotal,
        total: subtotal,
        currency: 'EUR',
        metadata: (input.metadata ?? {}) as never,
        items: { create: input.items.map((i) => ({
          productId: i.productId ?? null,
          applianceId: i.applianceId ?? null,
          name: i.name,
          sku: i.sku ?? null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.unitPrice * i.quantity,
        })) },
      },
      include: { items: true },
    });
    return ok(order);
  }
}
