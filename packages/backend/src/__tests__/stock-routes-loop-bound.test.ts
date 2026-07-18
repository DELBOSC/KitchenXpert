/**
 * Regression proof: the stock routes cap client-controlled id lengths (js/loop-bound-injection).
 *
 * The mock stock helpers iterate `productId.length` in a hash loop (stock-checker.service
 * mockStockStatus/mockQuantity/mockStoreAvailability). Before the cap, `productId` was
 * `z.string().min(1)` with no `.max()`, so an authenticated client could POST a multi-MB
 * productId and force an arbitrarily long CPU loop — a DoS. This suite runs the REAL zod
 * validation (only auth/controller/logger/prisma are mocked) and asserts an oversized id is
 * rejected with 400 before the controller runs, while a normal id passes.
 */
import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response } from 'express';
import request from 'supertest';

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../database/client', () => ({ prisma: { $disconnect: jest.fn() } }));

const controllerHit = jest.fn();
jest.mock('../api/controllers/stock-controller', () => ({
  stockController: {
    checkStock: (_req: Request, res: Response) => {
      controllerHit();
      res.status(200).json({ success: true });
    },
    getBulkStock: (_req: Request, res: Response) => {
      controllerHit();
      res.status(200).json({ success: true });
    },
  },
}));

jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: Request & { user?: unknown }, _res: Response, next: () => void) => {
    req.user = { userId: 'u1', email: 'u@test.com', role: 'user' };
    next();
  },
  authorize: () => (_req: Request, _res: Response, next: () => void) => next(),
}));

// NOTE: validation-middleware is deliberately NOT mocked — we want the real zod schema.
import stockRoutes from '../api/routes/stock-routes';

function app(): Application {
  const a = express();
  a.use(cookieParser());
  a.use(express.json({ limit: '10mb' }));
  a.use('/stock', stockRoutes);
  return a;
}

describe('Stock routes — client id lengths are capped (js/loop-bound-injection)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a normal productId (controller runs)', async () => {
    const res = await request(app())
      .post('/stock/check')
      .send({ productId: 'SKU-12345', providerId: 'ikea' });
    expect(res.status).toBe(200);
    expect(controllerHit).toHaveBeenCalled();
  });

  it('🔒 rejects an oversized productId with 400 BEFORE the controller (no long loop)', async () => {
    const huge = 'a'.repeat(500_000); // would drive a 500k-iteration hash loop
    const res = await request(app())
      .post('/stock/check')
      .send({ productId: huge, providerId: 'ikea' });
    expect(res.status).toBe(400);
    expect(controllerHit).not.toHaveBeenCalled();
  });

  it('🔒 rejects an oversized productId inside a bulk item', async () => {
    const res = await request(app())
      .post('/stock/bulk')
      .send({ items: [{ productId: 'a'.repeat(500_000), providerId: 'ikea' }] });
    expect(res.status).toBe(400);
    expect(controllerHit).not.toHaveBeenCalled();
  });

  it('🔒 rejects an over-large bulk items array (amplification)', async () => {
    const items = Array.from({ length: 501 }, () => ({ productId: 'x', providerId: 'ikea' }));
    const res = await request(app()).post('/stock/bulk').send({ items });
    expect(res.status).toBe(400);
    expect(controllerHit).not.toHaveBeenCalled();
  });
});
