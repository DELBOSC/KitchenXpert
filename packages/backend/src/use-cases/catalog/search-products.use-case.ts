import { z } from 'zod';

import { ok, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const SearchProductsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  category: z.string().max(80).optional(),
  brand: z.string().max(80).optional(),
  providerId: z.string().uuid().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  isActive: z.coerce.boolean().default(true),
});

export type SearchProductsInput = z.infer<typeof SearchProductsSchema>;

export class SearchProductsUseCase implements UseCase<SearchProductsInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: SearchProductsInput): Promise<Result<unknown>> {
    const { page, limit, search, category, brand, providerId, minPrice, maxPrice, isActive } =
      input;

    const where: Record<string, unknown> = { isActive };
    if (category) {
      where.categoryId = category;
    }
    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }
    if (providerId) {
      where.providerId = providerId;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { category: { select: { id: true, name: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return ok({ data, total, page, totalPages: Math.ceil(total / limit) });
  }
}
