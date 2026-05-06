import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { ok, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const UpdatePreferencesSchema = z.object({
  userId: z.string().uuid(),
  language: z.enum(['fr', 'en', 'de', 'es', 'it']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.boolean().optional(),
  currency: z.string().length(3).optional(),
});

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

export class UpdatePreferencesUseCase implements UseCase<UpdatePreferencesInput, { ok: true }> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ userId, ...prefs }: UpdatePreferencesInput): Promise<Result<{ ok: true }>> {
    // Stored in a separate UserPreference table; upsert lets first-time users
    // create their row implicitly.
    await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...prefs },
      update: prefs,
    });
    return ok({ ok: true });
  }
}
