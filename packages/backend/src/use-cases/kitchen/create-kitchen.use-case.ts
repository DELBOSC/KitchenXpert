import { z } from 'zod';
import type { PrismaClient, Kitchen } from '@prisma/client';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const CreateKitchenSchema = z.object({
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(120),
  style: z.string().max(40).optional(),
  layout: z.string().max(40).optional(),
  width: z.number().positive(),
  length: z.number().positive(),
  height: z.number().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateKitchenInput = z.infer<typeof CreateKitchenSchema>;

export class CreateKitchenUseCase implements UseCase<CreateKitchenInput, Kitchen> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateKitchenInput): Promise<Result<Kitchen>> {
    // Authorisation: the kitchen must hang off a project the user owns.
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { userId: true },
    });
    if (!project) return err(DomainErrors.notFound('Project'));
    if (project.userId !== input.userId) return err(DomainErrors.forbidden('Project does not belong to user'));

    const kitchen = await this.prisma.kitchen.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        name: input.name,
        style: (input.style ?? 'modern') as never,
        layout: (input.layout ?? 'l_shaped') as never,
        width: input.width,
        length: input.length,
        height: input.height ?? 2.5,
        metadata: (input.metadata ?? {}) as never,
      },
    });
    return ok(kitchen);
  }
}
