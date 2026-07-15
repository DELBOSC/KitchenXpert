/**
 * Regression proof: the input-sanitizer refuses prototype-polluting keys.
 *
 * createSanitizeMiddleware rebuilds req.body/query/params by writing each source key
 * onto a fresh object via bracket access: `sanitizedObj[key] = ...`. Before the guard, a
 * request body carrying its own `__proto__` key (JSON `{"__proto__": {...}}` parses to an
 * OWN enumerable property, so Object.entries yields it) would rebind the sanitized object's
 * prototype — js/remote-property-injection. These tests assert the three write sites
 * (body/query/params) drop __proto__/constructor/prototype, and that a normal key still
 * passes through sanitized.
 */
import { createSanitizeMiddleware } from '../api/middleware/sanitize-middleware';

import type { Request, Response, NextFunction } from 'express';

function run(req: Partial<Request>): { req: Partial<Request>; nextErr: unknown } {
  const mw = createSanitizeMiddleware();
  let nextErr: unknown = null;
  const next: NextFunction = (err?: unknown) => {
    nextErr = err ?? null;
  };
  mw(req as Request, {} as Response, next);
  return { req, nextErr };
}

describe('sanitize-middleware — a polluting key cannot rebind the sanitized object prototype', () => {
  afterEach(() => {
    // Fail loudly if any test leaked global pollution.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('🔒 body: an own __proto__ key is dropped, not written', () => {
    const body = JSON.parse('{"name": "<b>ok</b>", "__proto__": {"polluted": "PWNED"}}');
    const { req, nextErr } = run({ body });
    expect(nextErr).toBeNull();
    const out = req.body as Record<string, unknown>;
    // __proto__ was not copied as an own key…
    expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
    // …the object's real prototype is untouched…
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    // …and no global pollution leaked.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    // The legit field still went through XSS sanitization.
    expect(out.name).toBe('&lt;b&gt;ok&lt;&#x2F;b&gt;');
  });

  it('🔒 body: constructor / prototype keys are dropped too', () => {
    const body = JSON.parse('{"constructor": {"x": 1}, "prototype": {"y": 2}, "keep": "v"}');
    const { req } = run({ body });
    const out = req.body as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(out, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(out, 'prototype')).toBe(false);
    expect(out.keep).toBe('v');
  });

  it('🔒 query: an own __proto__ key is dropped', () => {
    const query = JSON.parse('{"__proto__": {"polluted": "PWNED"}, "q": "term"}');
    const { req } = run({ query });
    const out = req.query as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(out.q).toBe('term');
  });

  it('🔒 params: an own __proto__ key is dropped', () => {
    const params = JSON.parse('{"__proto__": {"polluted": "PWNED"}, "id": "42"}');
    const { req } = run({ params });
    const out = req.params as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(out.id).toBe('42');
  });
});
