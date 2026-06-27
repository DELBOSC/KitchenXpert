import { describe, it, expect, vi } from 'vitest';

import { ApiAdapter, NetworkError, ParseError, RateLimitError, TimeoutError } from './api-adapter';

/** Minimal Response-like mock matching what ApiAdapter reads. */
function res(status: number, body: string, headers: Record<string, string> = {}) {
  return {
    status,
    statusText: `S${status}`,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(body),
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as Response;
}

const noSleep = () => Promise.resolve();

describe('ApiAdapter', () => {
  it('returns parsed JSON on 200', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(200, '{"a":1,"b":"x"}'));
    const api = new ApiAdapter({ fetchFn, sleepFn: noSleep });
    const out = await api.fetchJson<{ a: number; b: string }>('https://x.test/api');
    expect(out).toEqual({ a: 1, b: 'x' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('sends Accept + identifying User-Agent', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(200, '{}'));
    const api = new ApiAdapter({
      fetchFn,
      sleepFn: noSleep,
      userAgent: 'KitchenXpert-research/0.2',
    });
    await api.fetchJson('https://x.test/api');
    const headers = (fetchFn.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('KitchenXpert-research/0.2');
    expect(headers.Accept).toBe('application/json');
  });

  it('prepends baseUrl to relative paths only', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(200, '{}'));
    const api = new ApiAdapter({ fetchFn, sleepFn: noSleep, baseUrl: 'https://base.test' });
    await api.fetchJson('/p/1');
    await api.fetchJson('https://abs.test/p/2');
    expect(fetchFn.mock.calls[0][0]).toBe('https://base.test/p/1');
    expect(fetchFn.mock.calls[1][0]).toBe('https://abs.test/p/2');
  });

  it('retries on 429 then succeeds', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(res(429, '', { 'retry-after': '0' }))
      .mockResolvedValueOnce(res(200, '{"ok":true}'));
    const api = new ApiAdapter({ fetchFn, sleepFn: noSleep, maxRetries: 3 });
    const out = await api.fetchJson<{ ok: boolean }>('https://x.test/api');
    expect(out.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('throws RateLimitError when 429 persists past retries', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(429, '', { 'retry-after': '0' }));
    const api = new ApiAdapter({ fetchFn, sleepFn: noSleep, maxRetries: 2 });
    await expect(api.fetchJson('https://x.test/api')).rejects.toBeInstanceOf(RateLimitError);
    expect(fetchFn).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });

  it('retries on 500 then throws NetworkError', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(500, 'oops'));
    const api = new ApiAdapter({ fetchFn, sleepFn: noSleep, maxRetries: 2 });
    await expect(api.fetchJson('https://x.test/api')).rejects.toBeInstanceOf(NetworkError);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry a 404 (non-retryable)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(404, 'nope'));
    const api = new ApiAdapter({ fetchFn, sleepFn: noSleep, maxRetries: 3 });
    await expect(api.fetchJson('https://x.test/api')).rejects.toBeInstanceOf(NetworkError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('maps a timeout to TimeoutError', async () => {
    const timeoutErr = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    const fetchFn = vi.fn().mockRejectedValue(timeoutErr);
    const api = new ApiAdapter({ fetchFn, sleepFn: noSleep, maxRetries: 1 });
    await expect(api.fetchJson('https://x.test/api')).rejects.toBeInstanceOf(TimeoutError);
    expect(fetchFn).toHaveBeenCalledTimes(2); // timeout is retryable
  });

  it('throws ParseError on invalid JSON (no retry)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(200, '<html>not json</html>'));
    const api = new ApiAdapter({ fetchFn, sleepFn: noSleep, maxRetries: 3 });
    await expect(api.fetchJson('https://x.test/api')).rejects.toBeInstanceOf(ParseError);
    expect(fetchFn).toHaveBeenCalledTimes(1); // ParseError is not retryable
  });

  it('honors retry-after header for backoff delay', async () => {
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(res(429, '', { 'retry-after': '2' }))
      .mockResolvedValueOnce(res(200, '{}'));
    const api = new ApiAdapter({ fetchFn, sleepFn, maxRetries: 2 });
    await api.fetchJson('https://x.test/api');
    expect(sleepFn).toHaveBeenCalledWith(2000); // 2s -> 2000ms
  });
});
