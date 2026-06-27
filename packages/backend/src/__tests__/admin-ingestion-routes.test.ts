/**
 * Admin Ingestion Routes — integration tests (§15.8 step d).
 *
 * Valide le wiring Express de POST /admin/ingestion/run : auth admin-only,
 * parsing Zod du body, et format de réponse { success, data: IngestResult }.
 * L'orchestrateur + le repository sont mockés (pas de réseau, pas de DB) —
 * la persistance live est prouvée ailleurs (Phase 4.2 sur Supabase dev).
 */
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../database/client', () => ({
  prisma: {
    $disconnect: jest.fn(),
    // PrismaCategoryResolver (Phase 2) charge le référentiel slug->id ; [] -> ids null.
    productCategory: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

// Repository mocké : upsertBySku ne touche pas la DB.
const mockUpsertBySku = jest.fn().mockResolvedValue({ id: 'p1' });
jest.mock('../repositories/product-repository', () => ({
  ProductRepository: jest.fn().mockImplementation(() => ({ upsertBySku: mockUpsertBySku })),
}));

// Strategy renvoyée par l'orchestrateur : 1 produit valide + 1 invalide.
const okProduct = {
  sku: 'A1',
  name: 'Four',
  brand: 'Bosch',
  type: 'appliance',
  widthMm: 600,
  heightMm: 595,
  depthMm: 550,
  dimensionConfidence: 1,
  priceEurCents: null,
  currency: 'EUR',
  sourceLevel: 1,
  sourceUrl: 'https://eprel.ec.europa.eu/screen/product/ovens/1',
  lastVerifiedAt: new Date(),
  specifications: {},
};
const mockStrategy = {
  brandId: 'eprel',
  sourceLevel: 1,
  fetchProductsByCategory: jest.fn().mockResolvedValue([
    { success: true, product: okProduct, errors: [], warnings: [] },
    { success: false, errors: ['sku: Required'], warnings: [] },
  ]),
};
// Garde les exports réels (ApiValidationError utilisé par validateBody, etc.) ;
// n'override que l'orchestrateur + la liste de marques.
jest.mock('@kitchenxpert/common', () => ({
  ...jest.requireActual('@kitchenxpert/common'),
  SUPPORTED_BRANDS: ['ikea', 'lapeyre', 'eprel'],
  IngestionOrchestrator: jest.fn().mockImplementation(() => ({
    strategyFor: jest.fn(() => mockStrategy),
  })),
}));

let mockUserRole = 'admin';
let mockAuthenticated = true;
jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockAuthenticated) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }
    req.user = { userId: 'u1', email: 'admin@test.com', role: mockUserRole };
    next();
  },
  authorize: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    }
    next();
  },
}));

// Import après les mocks (validateBody + CatalogIngestionService restent RÉELS).
import adminIngestionRoutes from '../api/routes/admin-ingestion-routes';

function createTestApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/admin/ingestion', adminIngestionRoutes);
  // error handler minimal : respecte le statusCode des erreurs typées
  // (ApiValidationError -> 400), comme le handler global du vrai app.
  app.use(
    (err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
      res.status(err.statusCode ?? 500).json({ success: false, error: { message: err.message } });
    }
  );
  return app;
}

describe('POST /admin/ingestion/run', () => {
  let app: Application;
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockUserRole = 'admin';
    mockAuthenticated = true;
  });

  it('401 sans authentification', async () => {
    mockAuthenticated = false;
    await request(app)
      .post('/admin/ingestion/run')
      .send({ brand: 'eprel', query: 'ovens' })
      .expect(401);
  });

  it('403 pour un utilisateur non-admin', async () => {
    mockUserRole = 'user';
    await request(app)
      .post('/admin/ingestion/run')
      .send({ brand: 'eprel', query: 'ovens' })
      .expect(403);
  });

  it('400 si brand invalide (Zod réel)', async () => {
    await request(app)
      .post('/admin/ingestion/run')
      .send({ brand: 'leroy-merlin', query: 'cuisine' })
      .expect(400);
  });

  it('400 si query manquante (Zod réel)', async () => {
    await request(app).post('/admin/ingestion/run').send({ brand: 'eprel' }).expect(400);
  });

  it('200 + { success, data: IngestResult } sur happy path admin', async () => {
    const res = await request(app)
      .post('/admin/ingestion/run')
      .send({ brand: 'eprel', query: 'ovens' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      brand: 'eprel',
      query: 'ovens',
      fetched: 2,
      ingested: 1,
      skipped: 1,
    });
    expect(res.body.data.errors).toContain('sku: Required');
    expect(mockStrategy.fetchProductsByCategory).toHaveBeenCalledWith('ovens');
    expect(mockUpsertBySku).toHaveBeenCalledTimes(1); // le produit invalide n'est pas upserté
  });
});
