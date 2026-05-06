import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';
import { getStripeService } from '../../services/stripe-service';

export const CreatePaymentIntentSchema = z.object({
  userId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  amount: z.number().int().positive().describe('Amount in smallest currency unit (cents)'),
  currency: z.string().length(3),
  description: z.string().max(500).optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;

export class CreatePaymentIntentUseCase implements UseCase<CreatePaymentIntentInput, { clientSecret: string; paymentIntentId: string }> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreatePaymentIntentInput): Promise<Result<{ clientSecret: string; paymentIntentId: string }>> {
    if (input.orderId) {
      // IDOR protection: caller must own the order they're paying for.
      const order = await this.prisma.order.findUnique({
        where: { id: input.orderId },
        select: { userId: true, total: true },
      });
      if (!order) return err(DomainErrors.notFound('Order'));
      if (order.userId !== input.userId) return err(DomainErrors.forbidden('Order not owned'));
    }

    const stripe = getStripeService();
    const intent = await stripe.createPaymentIntent({
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      metadata: {
        userId: input.userId,
        ...(input.orderId && { orderId: input.orderId }),
      },
    });

    if (!intent.client_secret) {
      return err(DomainErrors.upstream('Payment intent missing client secret'));
    }

    return ok({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  }
}
