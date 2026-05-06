import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const DeleteProjectSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().optional(),
});

export type DeleteProjectInput = z.infer<typeof DeleteProjectSchema>;

/**
 * Soft-delete: marks the project archived and cascades a soft-delete on its
 * kitchens. Hard removal is reserved for the GDPR purge job.
 */
export class DeleteProjectUseCase implements UseCase<DeleteProjectInput, { ok: true }> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ projectId, userId, role }: DeleteProjectInput): Promise<Result<{ ok: true }>> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project) return err(DomainErrors.notFound('Project'));
    if (project.userId !== userId && role !== 'admin') {
      return err(DomainErrors.forbidden('You do not have access to this project'));
    }

    await this.prisma.$transaction([
      this.prisma.kitchen.updateMany({ where: { projectId, deletedAt: null }, data: { deletedAt: new Date() } }),
      this.prisma.project.update({ where: { id: projectId }, data: { status: 'archived' as never } }),
    ]);

    return ok({ ok: true });
  }
}
