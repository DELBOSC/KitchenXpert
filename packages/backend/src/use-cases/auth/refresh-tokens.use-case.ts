import { z } from 'zod';
import { DomainErrors, ok, err, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';
import { jwtService } from '../../auth/jwt.service';

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshInput = z.infer<typeof RefreshSchema>;
export type RefreshOutput = { tokens: ReturnType<typeof jwtService.generateTokens> };

export class RefreshTokensUseCase implements UseCase<RefreshInput, RefreshOutput> {
  async execute(input: RefreshInput): Promise<Result<RefreshOutput>> {
    try {
      const tokens = jwtService.refreshTokens(input.refreshToken);
      return ok({ tokens });
    } catch {
      return err(DomainErrors.unauthorized('Invalid or expired refresh token'));
    }
  }
}
