import { z } from 'zod';

import { ok, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const ListUserOrdersSchema = z.object({
  userId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().max(40).optional(),
});

export type ListUserOrdersInput = z.infer<typeof ListUserOrdersSchema>;

export class ListUserOrdersUseCase implements UseCase<ListUserOrdersInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ userId, page, limit, status }: ListUserOrdersInput): Promise<Result<unknown>> {
    const where = { userId, ...(status && { status: status as never }) };
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);
    return ok({ data, total, page, totalPages: Math.ceil(total / limit) });
  }
}
