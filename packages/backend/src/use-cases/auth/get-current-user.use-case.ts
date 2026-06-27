import { z } from 'zod';

import { DomainErrors, ok, err, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const GetCurrentUserSchema = z.object({
  userId: z.string().uuid(),
});

export type GetCurrentUserInput = z.infer<typeof GetCurrentUserSchema>;
export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  avatar: string | null;
  emailVerified: boolean;
  language: string;
  timezone: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export class GetCurrentUserUseCase implements UseCase<GetCurrentUserInput, CurrentUser> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ userId }: GetCurrentUserInput): Promise<Result<CurrentUser>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatar: true,
        emailVerified: true,
        language: true,
        timezone: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    if (!user) {
      return err(DomainErrors.notFound('User'));
    }
    return ok({ ...user, status: user.status as string });
  }
}
