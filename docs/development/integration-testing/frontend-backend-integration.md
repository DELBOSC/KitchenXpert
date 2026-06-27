# Frontend-Backend Integration Testing

**Last Updated:** 2026-01-10

## Table of Contents

- [Overview](#overview)
- [Testing API Integration](#testing-api-integration)
- [Mock Service Worker (MSW)](#mock-service-worker-msw)
- [Testing React Query Hooks](#testing-react-query-hooks)
- [Testing Authentication Flow](#testing-authentication-flow)
- [Testing Error Handling](#testing-error-handling)
- [Best Practices](#best-practices)

## Overview

Frontend-backend integration tests verify that the React frontend correctly
interacts with the Express backend API.

## Testing API Integration

### Basic API Test

```typescript
// src/api/__tests__/users.api.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUser } from '../hooks/useUser';
import { server } from '../mocks/server';
import { rest } from 'msw';

describe('User API Integration', () => {
  it('should fetch user data', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useUser('123'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      id: '123',
      name: 'Test User',
      email: 'test@example.com'
    });
  });
});
```

### Testing POST Requests

```typescript
// src/api/__tests__/designs.api.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateDesign } from '../hooks/useDesign';

describe('Design Creation API', () => {
  it('should create design', async () => {
    const { result } = renderHook(() => useCreateDesign(), {
      wrapper: createQueryWrapper(),
    });

    result.current.mutate({
      name: 'My Kitchen',
      data: { layout: 'L-shaped' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({
      id: expect.any(String),
      name: 'My Kitchen',
    });
  });
});
```

## Mock Service Worker (MSW)

### Setup MSW

```bash
pnpm add -D msw
```

### Server Setup

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Setup for tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### API Handlers

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // User endpoints
  rest.get('/api/v1/users/:id', (req, res, ctx) => {
    const { id } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id,
          name: 'Test User',
          email: 'test@example.com',
        },
      })
    );
  }),

  rest.post('/api/v1/users', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: '123',
          ...body,
        },
      })
    );
  }),

  // Design endpoints
  rest.get('/api/v1/designs', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            id: '1',
            name: 'Kitchen Design 1',
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );
  }),

  rest.post('/api/v1/designs', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: 'new-design-id',
          ...body,
          createdAt: new Date().toISOString(),
        },
      })
    );
  }),

  // Error scenarios
  rest.get('/api/v1/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
      })
    );
  }),
];
```

### Override Handlers in Tests

```typescript
test('should handle API error', async () => {
  // Override handler for this test
  server.use(
    rest.get('/api/v1/users/:id', (req, res, ctx) => {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        })
      );
    })
  );

  const { result } = renderHook(() => useUser('123'), {
    wrapper: createQueryWrapper(),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error.message).toContain('User not found');
});
```

## Testing React Query Hooks

### Query Hook Test

```typescript
// src/hooks/__tests__/useDesigns.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useDesigns } from '../useDesigns';
import { createQueryWrapper } from '../../test-utils';

describe('useDesigns', () => {
  it('should fetch designs', async () => {
    const { result } = renderHook(() => useDesigns(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].name).toBe('Kitchen Design 1');
  });

  it('should refetch on window focus', async () => {
    const { result } = renderHook(() => useDesigns(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Simulate window focus
    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });
  });
});
```

### Mutation Hook Test

```typescript
// src/hooks/__tests__/useCreateDesign.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateDesign } from '../useDesign';

describe('useCreateDesign', () => {
  it('should create design and invalidate cache', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateDesign(), {
      wrapper: createQueryWrapper(queryClient),
    });

    result.current.mutate({
      name: 'New Design',
      data: { layout: 'U-shaped' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data.name).toBe('New Design');
    expect(invalidateSpy).toHaveBeenCalledWith(['designs']);
  });

  it('should handle creation error', async () => {
    server.use(
      rest.post('/api/v1/designs', (req, res, ctx) => {
        return res(
          ctx.status(400),
          ctx.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid design data',
            },
          })
        );
      })
    );

    const { result } = renderHook(() => useCreateDesign(), {
      wrapper: createQueryWrapper(),
    });

    result.current.mutate({
      name: '',
      data: {},
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

## Testing Authentication Flow

### Login Component Test

```typescript
// src/components/__tests__/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '../../contexts/AuthContext';

describe('LoginForm', () => {
  it('should login successfully', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Login successful')).toBeInTheDocument();
    });
  });

  it('should show error for invalid credentials', async () => {
    server.use(
      rest.post('/api/v1/auth/login', (req, res, ctx) => {
        return res(
          ctx.status(401),
          ctx.json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid credentials'
            }
          })
        );
      })
    );

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
```

### Auth Context Test

```typescript
// src/contexts/__tests__/AuthContext.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  it('should login user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isAuthenticated).toBe(false);

    await result.current.login('test@example.com', 'password123');

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user.email).toBe('test@example.com');
    });
  });

  it('should logout user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await result.current.login('test@example.com', 'password123');
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await result.current.logout();

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

## Testing Error Handling

### API Error Handling

```typescript
// src/hooks/__tests__/error-handling.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '../useUser';

describe('API Error Handling', () => {
  it('should handle network error', async () => {
    server.use(
      rest.get('/api/v1/users/:id', (req, res) => {
        return res.networkError('Failed to connect');
      })
    );

    const { result } = renderHook(() => useUser('123'), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toContain('Failed to connect');
  });

  it('should handle timeout', async () => {
    server.use(
      rest.get('/api/v1/users/:id', async (req, res, ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 6000));
        return res(ctx.json({ data: {} }));
      })
    );

    const { result } = renderHook(() => useUser('123', { timeout: 1000 }), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 2000,
    });
  });

  it('should retry failed requests', async () => {
    let callCount = 0;

    server.use(
      rest.get('/api/v1/users/:id', (req, res, ctx) => {
        callCount++;

        if (callCount < 3) {
          return res(ctx.status(500));
        }

        return res(
          ctx.status(200),
          ctx.json({ success: true, data: { id: '123' } })
        );
      })
    );

    const { result } = renderHook(() => useUser('123', { retry: 3 }), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(callCount).toBe(3);
  });
});
```

## Best Practices

### 1. Use Test Utilities

```typescript
// test-utils/query-wrapper.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createQueryWrapper(queryClient?: QueryClient) {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        cacheTime: 0 // Disable caching
      }
    }
  });

  return ({ children }) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}
```

### 2. Test Loading States

```typescript
it('should show loading state', async () => {
  const { result } = renderHook(() => useDesigns(), {
    wrapper: createQueryWrapper(),
  });

  expect(result.current.isLoading).toBe(true);

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

### 3. Test Error States

```typescript
it('should show error state', async () => {
  server.use(
    rest.get('/api/v1/designs', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );

  const { result } = renderHook(() => useDesigns(), {
    wrapper: createQueryWrapper(),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
});
```

### 4. Clean Up After Tests

```typescript
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
```

## Related Documentation

- [Integration Testing Overview](./overview.md) - Testing strategy
- [E2E Testing](./e2e-testing.md) - End-to-end tests
- [Testing Guide](../testing.md) - General testing
- [API Documentation](../../api/overview.md) - API reference
