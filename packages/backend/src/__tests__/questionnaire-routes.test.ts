/**
 * Questionnaire Routes Tests
 *
 * Tests questionnaire endpoints:
 * - GET /questionnaire/progress (get user progress)
 * - GET /questionnaire/:section (get section data)
 * - POST /questionnaire/:section (save section data)
 * - Invalid section validation
 * - Auth guard (401 without token)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createModuleLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock('../../database/client', () => ({
  prisma: { $disconnect: vi.fn() },
}));

const mockQuestionnaireController = {
  getProgress: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: { completedSections: ['user-profile'], progress: 25 },
    });
  }),
  getSection: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: { roomWidth: 4, roomLength: 3 },
    });
  }),
  saveSection: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Section saved' });
  }),
  getAutoBridgeData: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  autoGenerate: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { designs: [] } });
  }),
  getAITips: vi.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { tips: [] } });
  }),
};

vi.mock('../../api/controllers/questionnaire-controller', () => ({
  questionnaireController: mockQuestionnaireController,
}));

vi.mock('../../api/middleware/validation-middleware', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  commonSchemas: { idParam: {} },
}));

vi.mock('../../api/middleware/rate-limit-middleware', () => ({
  aiRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

let mockAuthenticated = true;

vi.mock('../../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockAuthenticated) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    req.user = { userId: 'test-user-1', email: 'user@test.com', role: 'user' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

import questionnaireRoutes from '../../api/routes/questionnaire-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/questionnaire', questionnaireRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Questionnaire Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    mockAuthenticated = true;
  });

  describe('GET /questionnaire/progress', () => {
    it('should return questionnaire progress for authenticated user', async () => {
      const response = await request(app)
        .get('/questionnaire/progress')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('progress');
      expect(mockQuestionnaireController.getProgress).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .get('/questionnaire/progress')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /questionnaire/:section', () => {
    it('should return section data for valid section', async () => {
      const response = await request(app)
        .get('/questionnaire/spatial-constraints')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockQuestionnaireController.getSection).toHaveBeenCalled();
    });

    it('should return 400 for invalid section name', async () => {
      const response = await request(app)
        .get('/questionnaire/invalid-section')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid section');
    });
  });

  describe('POST /questionnaire/:section', () => {
    it('should save section data for valid section', async () => {
      const response = await request(app)
        .post('/questionnaire/user-profile')
        .send({ data: { name: 'John', age: 30 } })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockQuestionnaireController.saveSection).toHaveBeenCalled();
    });

    it('should return 400 for invalid section name', async () => {
      const response = await request(app)
        .post('/questionnaire/nonexistent-section')
        .send({ data: { foo: 'bar' } })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid section');
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .post('/questionnaire/user-profile')
        .send({ data: { name: 'John' } })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
