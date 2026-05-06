import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const UpdateProjectSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().optional(),
  patch: z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).nullable().optional(),
    budget: z.number().nonnegative().nullable().optional(),
    status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export class UpdateProjectUseCase implements UseCase<UpdateProjectInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ projectId, userId, role, patch }: UpdateProjectInput): Promise<Result<unknown>> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project) return err(DomainErrors.notFound('Project'));
    if (project.userId !== userId && role !== 'admin') {
      return err(DomainErrors.forbidden('You do not have access to this project'));
    }
    const updated = await this.prisma.project.update({ where: { id: projectId }, data: patch as never });
    return ok(updated);
  }
}
