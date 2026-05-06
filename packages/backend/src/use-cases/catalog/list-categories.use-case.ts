import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { ok, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const ListCategoriesSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
});

export type ListCategoriesInput = z.infer<typeof ListCategoriesSchema>;

export class ListCategoriesUseCase implements UseCase<ListCategoriesInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ parentId }: ListCategoriesInput): Promise<Result<unknown>> {
    const categories = await this.prisma.productCategory.findMany({
      where: { isActive: true, ...(parentId !== undefined && { parentId }) },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return ok(categories);
  }
}
