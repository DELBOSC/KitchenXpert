/**
 * verifyWebhook — the two authentication bypasses, replayed as attacks.
 *
 * A test that only checks the happy path would have stayed green through the whole
 * vulnerability: a valid webhook WAS accepted before the fix. The bypasses only show
 * up when you send the ATTACKER's request. So that is what these tests send.
 *
 *   Attack 1 — attacker supplies the key: sign the body with a secret you invented,
 *              hand that same secret over in `X-Webhook-Secret`. Used to verify. 200.
 *   Attack 2 — attacker supplies nothing: omit the secret header entirely. The check
 *              lived inside `if (secret) {…}`, so it was skipped and the request fell
 *              through to next(). 200 with no signature at all.
 *
 * Both must now be 401. And the mount itself must fail-closed when no secret is
 * configured — a webhook route that cannot verify anything must not exist.
 */
import crypto from 'crypto';

import { verifyWebhook, generateWebhookSignature } from '../api/middleware/webhook-middleware';

import type { Request, Response, NextFunction } from 'express';

const SERVER_SECRET = 'the-real-server-secret';

function mockReqRes(headers: Record<string, string>, body: unknown) {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lower[k.toLowerCase()] = v;
  }

  const req = {
    body,
    get: (name: string) => lower[name.toLowerCase()],
  } as unknown as Request;

  const res = {
    statusCode: 0,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(p: unknown) {
      this.payload = p;
      return this;
    },
  };

  const next = jest.fn() as unknown as NextFunction;
  return { req, res: res as unknown as Response & { statusCode: number }, next };
}

describe('verifyWebhook — the secret comes from the server, never the request', () => {
  const body = { event: 'order.paid', amount: 9999 };

  it('ACCEPTS a request signed with the SERVER secret (happy path still works)', async () => {
    const { signature, timestamp } = generateWebhookSignature(body, SERVER_SECRET);
    const { req, res, next } = mockReqRes(
      { 'X-Webhook-Signature': signature, 'X-Webhook-Timestamp': timestamp },
      body
    );
    await verifyWebhook({ secret: SERVER_SECRET })(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(0);
  });

  it('🔒 ATTACK 1: attacker signs with their OWN key and supplies it in a header → 401', async () => {
    const attackerKey = 'hunter2';
    // The attacker forges a perfectly valid HMAC — for their own key.
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const forged = `sha256=${crypto
      .createHmac('sha256', attackerKey)
      .update(`${timestamp}.${JSON.stringify(body)}`)
      .digest('hex')}`;

    const { req, res, next } = mockReqRes(
      {
        'X-Webhook-Signature': forged,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Secret': attackerKey, // the old code would have TRUSTED this
      },
      body
    );
    await verifyWebhook({ secret: SERVER_SECRET })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    // and the header they handed us was never even consulted
  });

  it('🔒 ATTACK 2: attacker omits the secret header entirely → 401 (was: fall-through to next())', async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const { req, res, next } = mockReqRes(
      { 'X-Webhook-Signature': 'sha256=whatever', 'X-Webhook-Timestamp': timestamp },
      body
    );
    await verifyWebhook({ secret: SERVER_SECRET })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('rejects an expired timestamp (replay window) even with a valid signature', async () => {
    const oldTs = (Math.floor(Date.now() / 1000) - 60 * 60).toString(); // 1h old
    const sig = `sha256=${crypto
      .createHmac('sha256', SERVER_SECRET)
      .update(`${oldTs}.${JSON.stringify(body)}`)
      .digest('hex')}`;
    const { req, res, next } = mockReqRes(
      { 'X-Webhook-Signature': sig, 'X-Webhook-Timestamp': oldTs },
      body
    );
    await verifyWebhook({ secret: SERVER_SECRET })(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('FAIL-CLOSED: refuses to construct with no secret configured', () => {
    const saved = process.env.WEBHOOK_SECRET;
    delete process.env.WEBHOOK_SECRET;
    try {
      expect(() => verifyWebhook()).toThrow(/no secret configured/i);
    } finally {
      if (saved !== undefined) {
        process.env.WEBHOOK_SECRET = saved;
      }
    }
  });
});
