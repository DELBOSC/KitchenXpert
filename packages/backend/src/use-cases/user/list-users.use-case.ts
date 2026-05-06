import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { ok, type Result } from '../../core/result';
import type { UseCase } from '../../core/use-case';

export const ListUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  role: z.enum(['user', 'admin', 'partner']).optional(),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
});

export type ListUsersInput = z.infer<typeof ListUsersSchema>;

export interface ListUsersOutput {
  users: Array<{
    id: string; email: string; firstName: string; lastName: string;
    role: string; status: string; createdAt: Date; lastLoginAt: Date | null;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

export class ListUsersUseCase implements UseCase<ListUsersInput, ListUsersOutput> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ page, limit, search, role, status }: ListUsersInput): Promise<Result<ListUsersOutput>> {
    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, status: true, createdAt: true, lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return ok({
      users: rows.map((u) => ({ ...u, status: u.status as string })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }
}
