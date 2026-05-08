import { z } from 'zod';

import { DomainErrors, ok, err, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const GetProjectSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().optional(),
});

export type GetProjectInput = z.infer<typeof GetProjectSchema>;

export class GetProjectUseCase implements UseCase<GetProjectInput, unknown> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ projectId, userId, role }: GetProjectInput): Promise<Result<unknown>> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        kitchens: {
          where: { deletedAt: null },
          select: { id: true, name: true, style: true, layout: true, thumbnail: true, score: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) {return err(DomainErrors.notFound('Project'));}
    if (project.userId !== userId && role !== 'admin') {
      return err(DomainErrors.forbidden('You do not have access to this project'));
    }
    return ok(project);
  }
}
