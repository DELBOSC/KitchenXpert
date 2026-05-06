import { z } from 'zod';
import type { PrismaClient, Project } from '@prisma/client';
import { ok, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const CreateProjectSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  budget: z.number().nonnegative().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).default('draft'),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export class CreateProjectUseCase implements UseCase<CreateProjectInput, Project> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateProjectInput): Promise<Result<Project>> {
    const project = await this.prisma.project.create({
      data: {
        userId: input.userId,
        name: input.name,
        description: input.description ?? null,
        budget: input.budget ?? null,
        status: input.status as never,
        metadata: (input.metadata ?? {}) as never,
      },
    });
    return ok(project);
  }
}
