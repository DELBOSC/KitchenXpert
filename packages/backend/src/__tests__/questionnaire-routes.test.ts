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

import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() })),
}));

jest.mock('../database/client', () => ({
  prisma: { $disconnect: jest.fn() },
}));

const mockQuestionnaireController = {
  getProgress: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: { completedSections: ['user-profile'], progress: 25 },
    });
  }),
  getSection: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: { roomWidth: 4, roomLength: 3 },
    });
  }),
  saveSection: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Section saved' });
  }),
  getAutoBridgeData: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: {} });
  }),
  autoGenerate: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { designs: [] } });
  }),
  getAITips: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { tips: [] } });
  }),
};

jest.mock('../api/controllers/questionnaire-controller', () => ({
  questionnaireController: mockQuestionnaireController,
}));

jest.mock('../api/middleware/validation-middleware', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  commonSchemas: { idParam: {} },
}));

jest.mock('../api/middleware/rate-limit-middleware', () => ({
  aiRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  generalRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

let mockAuthenticated = true;

jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockAuthenticated) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    req.user = { userId: 'test-user-1', email: 'user@test.com', role: 'user' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

import questionnaireRoutes from '../api/routes/questionnaire-routes';

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
    jest.clearAllMocks();
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
      expect(JSON.stringify(response.body)).toContain('Invalid section');
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
      expect(JSON.stringify(response.body)).toContain('Invalid section');
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
