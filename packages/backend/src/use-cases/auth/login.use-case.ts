import bcrypt from 'bcrypt';
import { z } from 'zod';

import { jwtService } from '../../auth/jwt.service';
import { DomainErrors, ok, err, type Result } from '../../core/result';

import type { UseCase } from '../../core/use-case';
import type { PrismaClient } from '@prisma/client';

export const LoginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase()),
  password: z.string().min(1).max(200),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export interface LoginOutput {
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
  tokens: { accessToken: string; refreshToken: string; expiresIn: number; tokenType: string };
}

/**
 * Validates credentials and issues JWT tokens. Returns UNAUTHORIZED for both
 * "user not found" and "wrong password" with identical timing characteristics
 * (bcrypt.compare always runs) to prevent email enumeration.
 */
export class LoginUseCase implements UseCase<LoginInput, LoginOutput> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: LoginInput): Promise<Result<LoginOutput>> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    // Hash the input password against a fixed dummy hash when no user exists,
    // so timing of the response stays constant regardless of email validity.
    const dummyHash = `$2b$12$${'X'.repeat(53)}`;
    const passwordOk = await bcrypt.compare(input.password, user?.password ?? dummyHash);

    if (!user || !passwordOk) {
      return err(DomainErrors.unauthorized('Invalid credentials'));
    }
    if (user.status !== 'active') {
      return err(DomainErrors.unauthorized('Account is not active'));
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokens = jwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role as never,
    });

    return ok({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
    });
  }
}
