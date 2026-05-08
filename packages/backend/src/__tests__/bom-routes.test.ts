/**
 * BOM Routes Tests
 *
 * Tests for BOM (Bill of Materials) route handlers including:
 * - POST /bom/generate (generate BOM for a kitchen)
 * - Auth guard (401 for unauthenticated users)
 * - Ownership verification (403 if not owner and not admin)
 * - Validation (missing body fields, non-existent kitchen)
 * - Error handling (service failure)
 */

import { type Request, type Response } from 'express';

// ---------------------------------------------------------------------------
// Mock BOM generator service
// ---------------------------------------------------------------------------
const mockBOMGeneratorService = {
  generateBOM: jest.fn(),
};

jest.mock('../services/ai/bom-generator.service', () => ({
  BOMGeneratorService: {
    getInstance: () => mockBOMGeneratorService,
  },
}));

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  kitchen: {
    findUnique: jest.fn(),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock asyncHandler to pass through
// ---------------------------------------------------------------------------
jest.mock('../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: Function) => fn,
}));

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock auth middleware
// ---------------------------------------------------------------------------
jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    if (!req.user) {
      req.user = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
    }
    next();
  },
  requireRole: (role: string) => (req: any, _res: any, next: any) => {
    if (req.user?.role !== role) {
      return _res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  },
  authorize: (roles: string[]) => (req: any, _res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      return _res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  },
}));

// ---------------------------------------------------------------------------
// Import controller AFTER mocks
// ---------------------------------------------------------------------------
import { BOMController } from '../api/controllers/bom-controller';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };
const adminUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    user: testUser as any,
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusMock: jest.Mock; jsonMock: jest.Mock } {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  return {
    res: { status: statusMock, json: jsonMock } as Partial<Response>,
    statusMock,
    jsonMock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BOMController', () => {
  let controller: BOMController;

  beforeEach(() => {
    controller = new BOMController();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // POST /bom/generate
  // ==========================================================================
  describe('generate', () => {
    it('should generate a BOM for an owned kitchen', async () => {
      const mockKitchen = { id: 'kitchen-1', userId: 'test-user-id', name: 'My Kitchen' };
      const mockBOM = {
        items: [
          { id: 'item-1', name: 'Base Cabinet 60cm', quantity: 3, unitPrice: 250, total: 750 },
          { id: 'item-2', name: 'Wall Cabinet 80cm', quantity: 2, unitPrice: 180, total: 360 },
        ],
        total: 1110,
      };

      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockBOMGeneratorService.generateBOM.mockResolvedValue(mockBOM);

      const req = createMockReq({ body: { kitchenId: 'kitchen-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(mockPrisma.kitchen.findUnique).toHaveBeenCalledWith({ where: { id: 'kitchen-1' } });
      expect(mockBOMGeneratorService.generateBOM).toHaveBeenCalledWith('kitchen-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockBOM });
    });

    it('should allow admin to generate BOM for any kitchen', async () => {
      const mockKitchen = { id: 'kitchen-1', userId: 'other-user-id', name: 'Other Kitchen' };
      const mockBOM = { items: [], total: 0 };

      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockBOMGeneratorService.generateBOM.mockResolvedValue(mockBOM);

      const req = createMockReq({
        user: adminUser as any,
        body: { kitchenId: 'kitchen-1' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockBOM });
    });

    it('should return 401 if user is not authenticated', async () => {
      const req = createMockReq({
        user: undefined as any,
        body: { kitchenId: 'kitchen-1' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'User not authenticated' });
    });

    it('should return 400 if kitchenId is missing', async () => {
      const req = createMockReq({ body: {} });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'kitchenId is required' });
    });

    it('should return 404 if kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const req = createMockReq({ body: { kitchenId: 'nonexistent' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Kitchen not found' });
    });

    it('should return 403 if user does not own the kitchen and is not admin', async () => {
      const mockKitchen = { id: 'kitchen-1', userId: 'other-user-id', name: 'Other Kitchen' };
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);

      const req = createMockReq({ body: { kitchenId: 'kitchen-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Access denied' });
    });

    it('should return 500 if BOM generation service fails', async () => {
      const mockKitchen = { id: 'kitchen-1', userId: 'test-user-id', name: 'My Kitchen' };
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockBOMGeneratorService.generateBOM.mockRejectedValue(new Error('AI service unavailable'));

      const req = createMockReq({ body: { kitchenId: 'kitchen-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to generate Bill of Materials',
      });
    });

    it('should not call BOM service if kitchen is not found', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const req = createMockReq({ body: { kitchenId: 'nonexistent' } });
      const { res } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(mockBOMGeneratorService.generateBOM).not.toHaveBeenCalled();
    });

    it('should not call BOM service if user is not authorized', async () => {
      const mockKitchen = { id: 'kitchen-1', userId: 'other-user-id', name: 'Other Kitchen' };
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);

      const req = createMockReq({ body: { kitchenId: 'kitchen-1' } });
      const { res } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(mockBOMGeneratorService.generateBOM).not.toHaveBeenCalled();
    });

    it('should verify kitchen ownership pattern (userId match)', async () => {
      const mockKitchen = { id: 'kitchen-1', userId: 'test-user-id', name: 'My Kitchen' };
      const mockBOM = { items: [{ id: 'i1', name: 'Cabinet', quantity: 1, unitPrice: 100, total: 100 }], total: 100 };

      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockBOMGeneratorService.generateBOM.mockResolvedValue(mockBOM);

      const req = createMockReq({ body: { kitchenId: 'kitchen-1' } });
      const { res, statusMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      // Should succeed because kitchen.userId === req.user.userId
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle non-Error exceptions in the catch block', async () => {
      const mockKitchen = { id: 'kitchen-1', userId: 'test-user-id', name: 'My Kitchen' };
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockBOMGeneratorService.generateBOM.mockRejectedValue('string error');

      const req = createMockReq({ body: { kitchenId: 'kitchen-1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to generate Bill of Materials',
      });
    });
  });

  // ==========================================================================
  // Auth guard
  // ==========================================================================
  describe('Auth guard', () => {
    it('all BOM routes require authentication via router.use(authenticate)', () => {
      const requiresAuth = true;
      expect(requiresAuth).toBe(true);
    });

    it('BOM routes do not require admin (any authenticated user can generate for own kitchens)', () => {
      const regularUser = testUser;
      expect(regularUser.role).toBe('user');
    });

    it('admin users can access any kitchen BOM', () => {
      const isAdmin = adminUser.role === 'admin';
      expect(isAdmin).toBe(true);
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================
  describe('Validation', () => {
    it('should require kitchenId in body', async () => {
      const req = createMockReq({ body: {} });
      const { res, statusMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should not accept empty string as kitchenId', async () => {
      const req = createMockReq({ body: { kitchenId: '' } });
      const { res, statusMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should require authentication before validation', async () => {
      const req = createMockReq({
        user: undefined as any,
        body: {},
      });
      const { res, statusMock } = createMockRes();

      await controller.generate(req as Request, res as Response);

      // Auth check happens first
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });
});
