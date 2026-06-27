import { z } from 'zod';

import { ok, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const ListUserKitchensSchema = z.object({
  userId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  style: z.string().optional(),
  layout: z.string().optional(),
  isGenerated: z.coerce.boolean().optional(),
});

export type ListUserKitchensInput = z.infer<typeof ListUserKitchensSchema>;

export class ListUserKitchensUseCase implements UseCase<ListUserKitchensInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({
    userId,
    page,
    limit,
    style,
    layout,
    isGenerated,
  }: ListUserKitchensInput): Promise<Result<unknown>> {
    const where = {
      userId,
      deletedAt: null,
      ...(style && { style: style as never }),
      ...(layout && { layout: layout as never }),
      ...(isGenerated !== undefined && { isGenerated }),
    };

    const [data, total] = await Promise.all([
      this.prisma.kitchen.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { configuration: true, _count: { select: { items: true } } },
      }),
      this.prisma.kitchen.count({ where }),
    ]);

    return ok({ data, total, page, totalPages: Math.ceil(total / limit) });
  }
}
