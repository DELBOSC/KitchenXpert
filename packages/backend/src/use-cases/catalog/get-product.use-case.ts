import { z } from 'zod';

import { DomainErrors, ok, err, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const GetProductSchema = z.object({
  productId: z.string().uuid(),
});

export type GetProductInput = z.infer<typeof GetProductSchema>;

export class GetProductUseCase implements UseCase<GetProductInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ productId }: GetProductInput): Promise<Result<unknown>> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        provider: { select: { id: true, name: true } },
      },
    });
    if (!product) {return err(DomainErrors.notFound('Product'));}
    return ok(product);
  }
}
