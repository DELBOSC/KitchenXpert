/**
 * Regression proof: the schema validator's email check is bounded against ReDoS.
 *
 * `email()` fields run a private isValidEmail whose regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
 * is genuinely quadratic (js/polynomial-redos, proven under-eye: 20k→0.65s, 80k→10.3s).
 * A length guard (RFC 5321 max 254) is applied BEFORE the regex, so an oversized string is
 * rejected without ever reaching the backtracking engine.
 *
 * We test through the PUBLIC API (validate + email), the actual reachable path, and the
 * time assertion IS load-bearing here: without the guard the 200k-char payload takes
 * tens of seconds; with it, microseconds.
 */
import { validate, email } from '@kitchenxpert/common';

const schema = { email: email() };

describe('schema email validator — bounded against polynomial-redos', () => {
  it('accepts a normal email (no behaviour change)', () => {
    const r = validate({ email: 'laurent@kitchenxpert.dev' }, schema);
    expect(r.valid).toBe(true);
  });

  it('rejects a malformed email as before', () => {
    const r = validate({ email: 'not-an-email' }, schema);
    expect(r.valid).toBe(false);
  });

  it('🔒 a quadratic ReDoS payload is rejected fast, not evaluated', () => {
    // TRUE catastrophic input: the trailing space makes the `$` anchor fail, forcing the
    // two dot-eating `[^\s@]+` groups around `\.` to try every split — O(n²). Measured on
    // the raw regex: 20k→0.72s, 40k→2.87s; at 140k it is tens of seconds. The 254-char
    // guard rejects it before the regex ever runs, so this must complete near-instantly.
    // (A prior draft used a trailing '-', which is in [^\s@] → the regex SUCCEEDS greedily
    //  in 0ms, so it did NOT exercise the ReDoS. This payload does — the assertion below is
    //  load-bearing: remove the guard and it blows past the threshold.)
    const payload = 'a@' + 'a.'.repeat(70000) + ' ';
    expect(payload.length).toBeGreaterThan(100000);
    const start = Date.now();
    const r = validate({ email: payload }, schema);
    const elapsed = Date.now() - start;
    expect(r.valid).toBe(false); // too long → not an email
    expect(elapsed).toBeLessThan(50); // guard fired before the regex; no ReDoS
  });

  it('a 254-char address is still allowed to reach the regex (guard is exactly RFC 5321)', () => {
    // local part padded to make total length 254, valid shape → should pass the regex.
    const local = 'a'.repeat(254 - '@ex.com'.length);
    const addr = `${local}@ex.com`;
    expect(addr.length).toBe(254);
    const r = validate({ email: addr }, schema);
    expect(r.valid).toBe(true);
  });
});
