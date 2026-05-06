/**
 * Upload Routes Tests
 *
 * Tests file upload endpoints:
 * - POST /uploads (multipart file upload)
 * - GET /uploads (list files)
 * - GET /uploads/allowed-types (public, no auth)
 * - DELETE /uploads/:key (delete file)
 * - Auth guard (401 without token)
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

const mockUploadController = {
  getAllowedTypes: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: ['image/jpeg', 'image/png', 'application/pdf'],
    });
  }),
  uploadFile: jest.fn((_req: Request, res: Response) => {
    res.status(201).json({
      success: true,
      data: { key: 'uploads/test-file.jpg', url: 'https://s3.example.com/uploads/test-file.jpg' },
    });
  }),
  listFiles: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: [{ key: 'uploads/file1.jpg' }, { key: 'uploads/file2.png' }],
    });
  }),
  getFile: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { url: 'https://s3.example.com/signed-url' } });
  }),
  getFileMetadata: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { size: 12345, contentType: 'image/jpeg' } });
  }),
  deleteFile: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'File deleted' });
  }),
  getSignedUploadUrl: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { uploadUrl: 'https://s3.example.com/presigned' } });
  }),
  copyFile: jest.fn((_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'File copied' });
  }),
};

jest.mock('../api/controllers/upload-controller', () => ({
  uploadController: mockUploadController,
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

import uploadRoutes from '../api/routes/upload-routes';

// ==================== TEST APP ====================

function createTestApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/uploads', uploadRoutes);
  return app;
}

// ==================== TESTS ====================

describe('Upload Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockAuthenticated = true;
  });

  describe('GET /uploads/allowed-types (public)', () => {
    it('should return allowed file types without auth', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .get('/uploads/allowed-types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(mockUploadController.getAllowedTypes).toHaveBeenCalled();
    });
  });

  describe('POST /uploads', () => {
    it('should upload a file and return 201', async () => {
      const response = await request(app)
        .post('/uploads')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('key');
      expect(response.body.data).toHaveProperty('url');
      expect(mockUploadController.uploadFile).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .post('/uploads')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /uploads', () => {
    it('should list uploaded files', async () => {
      const response = await request(app)
        .get('/uploads')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(mockUploadController.listFiles).toHaveBeenCalled();
    });
  });

  describe('DELETE /uploads/:key', () => {
    it('should delete a file', async () => {
      const response = await request(app)
        .delete('/uploads/test-file.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockUploadController.deleteFile).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticated = false;
      const response = await request(app)
        .delete('/uploads/test-file.jpg')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
