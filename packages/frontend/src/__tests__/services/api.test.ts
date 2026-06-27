/**
 * API Service Tests
 * Tests for centralized API client - requests, error handling, and cookie-based auth.
 * Authentication uses httpOnly cookies with credentials: 'include' (no localStorage tokens).
 */

import { vi } from 'vitest';

// Mock location
const locationMock = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import { api } from '../../services/api/api';

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationMock.href = '';
  });

  describe('HTTP Methods', () => {
    describe('api.get', () => {
      it('should make GET request with correct method', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        await api.get('/test-endpoint');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/test-endpoint'),
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('should return success response with data', async () => {
        const mockData = { id: 1, name: 'Test' };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: mockData }),
        });

        const result = await api.get<typeof mockData>('/test-endpoint');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockData);
      });

      it('should include query params in URL', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: {} }),
        });

        await api.get('/test-endpoint', { params: { page: 1, limit: 10 } });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=1'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=10'),
          expect.any(Object)
        );
      });
    });

    describe('api.post', () => {
      it('should make POST request with body', async () => {
        const requestBody = { email: 'test@example.com', password: 'password123' };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: { id: 1 } }),
        });

        await api.post('/auth/login', requestBody);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(requestBody),
          })
        );
      });

      it('should handle POST without body', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: {} }),
        });

        await api.post('/test-endpoint');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: undefined,
          })
        );
      });
    });

    describe('api.put', () => {
      it('should make PUT request with body', async () => {
        const updateData = { name: 'Updated Name' };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: updateData }),
        });

        await api.put('/users/1', updateData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/users/1'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(updateData),
          })
        );
      });
    });

    describe('api.patch', () => {
      it('should make PATCH request with body', async () => {
        const patchData = { status: 'active' };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: patchData }),
        });

        await api.patch('/users/1', patchData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/users/1'),
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(patchData),
          })
        );
      });
    });

    describe('api.delete', () => {
      it('should make DELETE request', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { deleted: true } }),
        });

        await api.delete('/users/1');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/users/1'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('Cookie-Based Authentication', () => {
    it('should include credentials: include on all requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: {} }),
      });

      await api.get('/protected-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: {} }),
      });

      await api.get('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return error response for failed requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
          }),
      });

      const result = await api.post('/test-endpoint', { invalid: 'data' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBe('Invalid input');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await api.get('/test-endpoint');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.message).toBe('Network error');
    });

    it('should handle timeout errors', async () => {
      // Mock AbortError
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await api.get('/test-endpoint', { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TIMEOUT');
      expect(result.error?.message).toBe('Request timed out');
    });

    it('should include HTTP status code in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Resource not found' }),
      });

      const result = await api.get('/non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HTTP_404');
    });
  });

  describe('Token Refresh (cookie-based)', () => {
    it('should attempt token refresh on 401 response', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      // Refresh token call succeeds (cookie-based)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Retry with refreshed cookie
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { success: true } }),
      });

      const result = await api.get('/protected-endpoint');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it('should dispatch an auth:unauthorized event when refresh fails', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      // Refresh token fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid refresh token' }),
      });

      const listener = vi.fn();
      window.addEventListener('auth:unauthorized', listener);

      // Refresh failure is reported via the NETWORK_ERROR envelope (the
      // 'Session expired' error is caught by the request's try/catch).
      const result = await api.get('/protected-endpoint');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);

      window.removeEventListener('auth:unauthorized', listener);
    });
  });

  describe('Response Handling', () => {
    it('should extract data from response', async () => {
      const responseData = { id: 1, name: 'Test Item' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: responseData }),
      });

      const result = await api.get<typeof responseData>('/items/1');

      expect(result.data).toEqual(responseData);
    });

    it('should include meta information in response', async () => {
      const responseWithMeta = {
        data: [{ id: 1 }, { id: 2 }],
        meta: {
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(responseWithMeta),
      });

      const result = await api.get('/items');

      expect(result.meta).toEqual(responseWithMeta.meta);
    });

    it('should handle response without data wrapper', async () => {
      const directResponse = { id: 1, name: 'Direct Response' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(directResponse),
      });

      const result = await api.get('/direct-response');

      expect(result.data).toEqual(directResponse);
    });
  });

  describe('URL Building', () => {
    it('should handle undefined params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: {} }),
      });

      await api.get('/test', { params: { defined: 'value', undef: undefined } });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('defined=value');
      expect(calledUrl).not.toContain('undef');
    });

    it('should properly encode special characters in params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: {} }),
      });

      await api.get('/search', { params: { query: 'test & query' } });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('query=test+%26+query');
    });
  });

  describe('Request Configuration', () => {
    it('should accept custom timeout', async () => {
      // This test verifies that custom timeout is passed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: {} }),
      });

      await api.get('/test', { timeout: 60000 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should use default timeout when not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: {} }),
      });

      await api.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });
});
