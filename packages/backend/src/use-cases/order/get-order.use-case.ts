import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const GetOrderSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().optional(),
});

export type GetOrderInput = z.infer<typeof GetOrderSchema>;

export class GetOrderUseCase implements UseCase<GetOrderInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ orderId, userId, role }: GetOrderInput): Promise<Result<unknown>> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, project: { select: { id: true, name: true } } },
    });
    if (!order) return err(DomainErrors.notFound('Order'));
    if (order.userId !== userId && role !== 'admin') {
      return err(DomainErrors.forbidden('You do not have access to this order'));
    }
    return ok(order);
  }
}
