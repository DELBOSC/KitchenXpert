/**
 * Room Scan Routes Tests
 *
 * Tests room scan endpoints:
 * - POST /room-scan/analyze (analyze room from photos)
 * - POST /room-scan/photo-scan (photo-based room scan)
 * - Auth guard (401 without token)
 * - Rate limiting awareness
 */

import request from 'supertest';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// ==================== MOCKS ====================

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() })),
}));

jest.mock('../database/client', () => ({
  prisma: { $disconnect: jest.fn() },
}));

const mockRoomScanController = {
  analyzeRoom: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        width: 3.5,
        length: 4.2,
        height: 2.5,
        confidence: 0.85,
      },
    });
  }),
  photoScan: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        dimensions: { width: 3.5, length: 4.2, height: 2.5 },
        walls: [],
        openings: [],
        obstacles: [],
      },
    });
  }),
};

jest.mock('../api/controllers/room-scan-controller', () => ({
  roomScanController: mockRoomScanController,
}));

// Mock multer upload middleware to pass through
jest.mock('../middleware/upload-middleware', () => ({
  uploadSingle: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  uploadMultipleImages: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  handleUploadError: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Mock rate limiter
jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: () => (_req: Request, _res: Response, next: NextFunction) => next(),
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

import roomScanRoutes from '../api/routes/room-scan-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/room-scan', roomScanRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Room Scan Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockAuthenticated = true;
  });

  describe('POST /room-scan/analyze', () => {
    it('should analyze room dimensions from photos', async () => {
      const response = await request(app)
        .post('/room-scan/analyze')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('width');
      expect(response.body.data).toHaveProperty('length');
      expect(response.body.data).toHaveProperty('confidence');
      expect(mockRoomScanController.analyzeRoom).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .post('/room-scan/analyze')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /room-scan/photo-scan', () => {
    it('should perform photo-based room scan', async () => {
      const response = await request(app)
        .post('/room-scan/photo-scan')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dimensions');
      expect(response.body.data).toHaveProperty('walls');
      expect(response.body.data).toHaveProperty('openings');
      expect(mockRoomScanController.photoScan).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .post('/room-scan/photo-scan')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
