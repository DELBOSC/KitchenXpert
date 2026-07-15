/**
 * @kitchenxpert/common set() was a global prototype-pollution gadget
 * (CodeQL js/prototype-pollution-utility on object-transformation.ts:162).
 *
 * set(obj, '__proto__.x', v) walked INTO Object.prototype and the final write landed on
 * it — every object in the process would inherit the injected property. Proven at runtime
 * before the fix. common has no jest runner, so the regression test lives here, importing
 * the built util through the TransformUtils namespace barrel.
 */
import { TransformUtils } from '@kitchenxpert/common';

const { set, unflattenObject, deepMerge, mapValues } = TransformUtils;

describe('common TransformUtils — no global prototype pollution', () => {
  afterEach(() => {
    delete (Object.prototype as Record<string, unknown>).polluted;
  });

  it('🔒 set() refuses a __proto__ path segment (was: global Object.prototype pollution)', () => {
    set({}, '__proto__.polluted', 'PWNED');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('🔒 set() refuses constructor / prototype segments too', () => {
    set({}, 'constructor.prototype.polluted', 'x');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('🔒 unflattenObject (walks via set) is protected transitively', () => {
    unflattenObject({ '__proto__.polluted': 'x' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('deepMerge / mapValues do not pollute the global prototype', () => {
    const evil = JSON.parse('{"__proto__": {"polluted": "x"}}');
    deepMerge({}, evil);
    mapValues(evil, (v: unknown) => v);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('set() still works for legitimate nested paths', () => {
    const out = set({}, 'a.b.c', 42) as { a: { b: { c: number } } };
    expect(out.a.b.c).toBe(42);
  });
});
