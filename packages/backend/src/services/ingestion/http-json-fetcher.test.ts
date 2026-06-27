import { HttpJsonFetcher } from './http-json-fetcher';

describe('HttpJsonFetcher', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('envoie UA + Accept + headers par appel (ex. Origin) et parse le JSON', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const f = new HttpJsonFetcher('UA/test');
    const out = await f.fetchJson<{ a: number }>('https://x/y', {
      headers: { Origin: 'https://x' },
    });

    expect(out).toEqual({ a: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://x/y');
    expect(init.headers['User-Agent']).toBe('UA/test');
    expect(init.headers.Accept).toBe('application/json');
    expect(init.headers.Origin).toBe('https://x');
  });

  it('throw sur réponse non-ok (status dans le message)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const f = new HttpJsonFetcher();
    await expect(f.fetchJson('https://x')).rejects.toThrow(/HTTP 503/);
  });
});
