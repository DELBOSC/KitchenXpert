import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { ok, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const ListUserProjectsSchema = z.object({
  userId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
});

export type ListUserProjectsInput = z.infer<typeof ListUserProjectsSchema>;

export class ListUserProjectsUseCase implements UseCase<ListUserProjectsInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ userId, page, limit, status }: ListUserProjectsInput): Promise<Result<unknown>> {
    const where = { userId, ...(status && { status: status as never }) };
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { kitchens: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);
    return ok({ data, total, page, totalPages: Math.ceil(total / limit) });
  }
}
