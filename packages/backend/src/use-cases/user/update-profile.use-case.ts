import { z } from 'zod';

import { DomainErrors, ok, err, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const UpdateProfileSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().max(20).nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  language: z.string().length(2).optional(),
  timezone: z.string().max(64).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export interface UpdateProfileOutput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  language: string;
  timezone: string;
}

export class UpdateProfileUseCase implements UseCase<UpdateProfileInput, UpdateProfileOutput> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ userId, ...patch }: UpdateProfileInput): Promise<Result<UpdateProfileOutput>> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: patch,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          language: true,
          timezone: true,
        },
      });
      return ok(user);
    } catch (e: unknown) {
      // Prisma throws P2025 when the row doesn't exist — translate to NOT_FOUND.
      if ((e as { code?: string })?.code === 'P2025') {
        return err(DomainErrors.notFound('User'));
      }
      throw e;
    }
  }
}
