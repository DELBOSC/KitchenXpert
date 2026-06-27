# Use-Case Layer — Migration Guide

This folder contains the **business logic** of the backend, decoupled from HTTP,
database vendor specifics and side-effects (emails, cookies, Stripe).

A `UseCase` is the smallest unit of behaviour the system exposes. It takes a
typed input, runs validation + persistence, and returns a
`Result<T, DomainError>`. Controllers become thin HTTP adapters.

## Status

| Domain                                                                | Migrated | Use-cases                                                     | Notes                                                                                                      |
| --------------------------------------------------------------------- | -------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| auth                                                                  | ✅       | 8                                                             | register, login, refresh, change-pwd, reset-pwd-request, reset-pwd-confirm, verify-email, get-current-user |
| user                                                                  | ✅       | 4                                                             | update-profile, update-preferences, list-users, update-status                                              |
| kitchen                                                               | ✅       | 5                                                             | create, get, list, update, delete                                                                          |
| project                                                               | ✅       | 5                                                             | create, get, list, update, delete                                                                          |
| catalog                                                               | ✅       | 3                                                             | search-products, get-product, list-categories                                                              |
| order                                                                 | ✅       | 3                                                             | create, list, get                                                                                          |
| payment                                                               | ✅       | 2                                                             | create-payment-intent, get-history                                                                         |
| **GDPR**                                                              | ✅       | (controller-based — see `api/controllers/gdpr-controller.ts`) |
| ----                                                                  | ----     | ----                                                          | **— pending —**                                                                                            |
| roles & permissions                                                   | ⏳       | —                                                             | Admin RBAC management                                                                                      |
| webhooks                                                              | ⏳       | —                                                             | Stripe + partner webhooks                                                                                  |
| audit                                                                 | ⏳       | —                                                             | Read-only audit trail queries                                                                              |
| i18n                                                                  | ⏳       | —                                                             | Locale + translation CRUD                                                                                  |
| monitoring                                                            | ⏳       | —                                                             | Health, metrics, dashboard                                                                                 |
| AI generators / chat / search                                         | ⏳       | —                                                             | Heavy use of external services                                                                             |
| Provider integrations (Ikea, Bosch, Schmidt, Castorama, Leroy-Merlin) | ⏳       | —                                                             | Mostly read-through proxies                                                                                |
| 13+ feature routes (renovation, financing, smart-home, …)             | ⏳       | —                                                             | Lower priority                                                                                             |

**Total in scope**: ~406 endpoints across 58 route files. **Migrated so far**:
~30.

## When to migrate

Don't migrate everything in one pass. Migrate when:

- you touch the controller for a feature change → migrate while you're there;
- a controller grows past ~100 lines or its tests get hard to write with mocks;
- a new feature needs business logic — write it as a UseCase from day 1.

Old-style controllers that just call Prisma directly continue to work alongside
the new layer.

## Pattern (reference: `auth/register.use-case.ts`)

```ts
// 1. Schema — single source of truth for input validation + OpenAPI docs.
export const FooSchema = z.object({ /* ... */ });
export type FooInput = z.infer<typeof FooSchema>;

// 2. Output type — explicit, no `any`.
export interface FooOutput { /* ... */ }

// 3. UseCase class — constructor takes its dependencies.
export class FooUseCase implements UseCase<FooInput, FooOutput> {
  constructor(private readonly prisma: PrismaClient /* + other deps */) {}

  async execute(input: FooInput): Promise<Result<FooOutput>> {
    // Authorisation first.
    if (/* not allowed */) return err(DomainErrors.forbidden('...'));

    // Domain checks.
    const existing = await this.prisma.foo.findUnique({ /* ... */ });
    if (existing) return err(DomainErrors.conflict('...', 'FOO_TAKEN'));

    // Persist.
    const created = await this.prisma.foo.create({ /* ... */ });

    return ok(created);
  }
}
```

## Wiring into routes (two options)

### Option A — `runUseCase` adapter (purest)

For endpoints with no exotic side-effects:

```ts
import { runUseCase } from '../../core/http';
import { FooUseCase, FooSchema } from '../../use-cases/foo';
import { prisma } from '../../database/client';

const fooUseCase = new FooUseCase(prisma);

router.post(
  '/foo',
  authenticate,
  runUseCase(FooSchema, fooUseCase, (body, req) => ({
    ...body,
    userId: req.user!.userId,
  }))
);
```

### Option B — controller delegates to UseCase (when side-effects matter)

For endpoints that set cookies, send emails, pad response time for timing-attack
mitigation, etc. The controller stays the HTTP boundary:

```ts
controller.action = asyncHandler(async (req, res) => {
  const out = await useCase.execute({
    /* ... */
  });
  if (!out.ok) {
    res.status(errorToStatus(out.error)).json(errorToBody(out.error));
    return;
  }
  // Side-effects
  setAuthCookies(res, out.value.tokens);
  await sendWelcomeEmail(out.value.user);
  res.status(201).json({ data: out.value });
});
```

## Testing

Unit-test the UseCase with a fake Prisma. Integration-test with testcontainers
(`use-cases/auth/__tests__/register.use-case.int.test.ts` is the reference).

The HTTP layer can have a thin smoke test that asserts status codes — the
business assertions belong on the UseCase.

## Migration checklist for one endpoint

1. Read the controller method, identify inputs/outputs/branches.
2. Write a Zod schema for the inputs (replaces ad-hoc `req.body` casting).
3. Create a UseCase class with the domain logic. **No HTTP knowledge**, no
   `req`, no `res`.
4. Map exceptions to `DomainError` codes. Throw becomes `return err(...)`.
5. Wire it via `runUseCase` (option A) or keep the controller as adapter (option
   B) for side-effects.
6. Update tests: domain coverage on the UseCase, smoke test on the route.
7. Register the route in `core/openapi.ts` so it appears in the generated spec.
