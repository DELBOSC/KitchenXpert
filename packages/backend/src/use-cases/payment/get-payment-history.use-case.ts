import { z } from 'zod';

import { DomainErrors, ok, err, type Result } from '../../core/result';
import { getStripeService } from '../../services/stripe-service';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const GetPaymentHistorySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetPaymentHistoryInput = z.infer<typeof GetPaymentHistorySchema>;

export class GetPaymentHistoryUseCase implements UseCase<GetPaymentHistoryInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ userId, limit }: GetPaymentHistoryInput): Promise<Result<unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return err(DomainErrors.notFound('Stripe customer'));
    }
    const stripe = getStripeService();
    const history = await stripe.getPaymentHistory(user.stripeCustomerId, userId, limit);
    return ok(history);
  }
}
