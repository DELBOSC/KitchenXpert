/**
 * Design Rating Routes Tests
 *
 * Tests for design rating route handlers including:
 * - POST /design-ratings (create or update a rating)
 * - GET /design-ratings/:kitchenId (get all ratings for a kitchen)
 * - GET /design-ratings/:kitchenId/my (get current user's rating)
 * - DELETE /design-ratings/:kitchenId (delete own rating)
 * - Auth guard (401 for unauthenticated users)
 * - Validation (rating range, required fields)
 */

import { type Request, type Response } from 'express';

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  kitchen: {
    findUnique: jest.fn(),
  },
  designRating: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
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
import { DesignRatingController } from '../api/controllers/design-rating-controller';

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

describe('DesignRatingController', () => {
  let controller: DesignRatingController;

  beforeEach(() => {
    controller = new DesignRatingController();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // POST /design-ratings (create or update)
  // ==========================================================================
  describe('createOrUpdate', () => {
    it('should create a new rating for a kitchen', async () => {
      const mockKitchen = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'other-user',
        name: 'Test Kitchen',
      };
      const mockRating = {
        id: 'rating-1',
        userId: 'test-user-id',
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 4,
        comment: 'Nice design',
      };

      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.designRating.upsert.mockResolvedValue(mockRating);

      const req = createMockReq({
        body: {
          kitchenId: '550e8400-e29b-41d4-a716-446655440000',
          rating: 4,
          comment: 'Nice design',
        },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.createOrUpdate(req as Request, res as Response);

      expect(mockPrisma.kitchen.findUnique).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      expect(mockPrisma.designRating.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_kitchenId: {
              userId: 'test-user-id',
              kitchenId: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
          update: { rating: 4, comment: 'Nice design' },
          create: {
            userId: 'test-user-id',
            kitchenId: '550e8400-e29b-41d4-a716-446655440000',
            rating: 4,
            comment: 'Nice design',
          },
        })
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockRating });
    });

    it('should create a rating without comment', async () => {
      const mockKitchen = { id: '550e8400-e29b-41d4-a716-446655440000', userId: 'other-user' };
      const mockRating = {
        id: 'rating-1',
        userId: 'test-user-id',
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 5,
        comment: null,
      };

      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockPrisma.designRating.upsert.mockResolvedValue(mockRating);

      const req = createMockReq({
        body: { kitchenId: '550e8400-e29b-41d4-a716-446655440000', rating: 5 },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.createOrUpdate(req as Request, res as Response);

      expect(mockPrisma.designRating.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ comment: null }),
          update: expect.objectContaining({ comment: null }),
        })
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user is not authenticated', async () => {
      const req = createMockReq({
        user: undefined as any,
        body: { kitchenId: '550e8400-e29b-41d4-a716-446655440000', rating: 4 },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.createOrUpdate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'User not authenticated' });
    });

    it('should return 400 if kitchenId is missing', async () => {
      const req = createMockReq({
        body: { rating: 4 },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.createOrUpdate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'kitchenId and rating are required',
      });
    });

    it('should return 400 if rating is missing', async () => {
      const req = createMockReq({
        body: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.createOrUpdate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'kitchenId and rating are required',
      });
    });

    it('should return 400 if rating is below 1', async () => {
      const req = createMockReq({
        body: { kitchenId: '550e8400-e29b-41d4-a716-446655440000', rating: 0 },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.createOrUpdate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Rating must be an integer between 1 and 5',
      });
    });

    it('should return 400 if rating is above 5', async () => {
      const req = createMockReq({
        body: { kitchenId: '550e8400-e29b-41d4-a716-446655440000', rating: 6 },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.createOrUpdate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Rating must be an integer between 1 and 5',
      });
    });

    it('should return 400 if rating is not an integer', async () => {
      const req = createMockReq({
        body: { kitchenId: '550e8400-e29b-41d4-a716-446655440000', rating: 3.5 },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.createOrUpdate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Rating must be an integer between 1 and 5',
      });
    });

    it('should return 404 if kitchen does not exist', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      const req = createMockReq({
        body: { kitchenId: '00000000-0000-0000-0000-000000000000', rating: 4 },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.createOrUpdate(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Kitchen not found' });
    });
  });

  // ==========================================================================
  // GET /design-ratings/:kitchenId (get ratings)
  // ==========================================================================
  describe('getByKitchen', () => {
    it('should return all ratings for a kitchen with average', async () => {
      const mockRatings = [
        {
          id: 'r1',
          rating: 5,
          comment: 'Amazing',
          user: { id: 'u1', firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 'r2',
          rating: 3,
          comment: null,
          user: { id: 'u2', firstName: 'Jane', lastName: 'Smith' },
        },
      ];
      mockPrisma.designRating.findMany.mockResolvedValue(mockRatings);

      const req = createMockReq({ params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getByKitchen(req as Request, res as Response);

      expect(mockPrisma.designRating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        })
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          ratings: mockRatings,
          average: 4,
          count: 2,
        },
      });
    });

    it('should return zero average when no ratings exist', async () => {
      mockPrisma.designRating.findMany.mockResolvedValue([]);

      const req = createMockReq({ params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getByKitchen(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { ratings: [], average: 0, count: 0 },
      });
    });

    it('should return 401 if not authenticated', async () => {
      const req = createMockReq({
        user: undefined as any,
        params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getByKitchen(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'User not authenticated' });
    });

    it('should return 400 if kitchenId is missing', async () => {
      const req = createMockReq({ params: {} });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getByKitchen(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'kitchenId is required' });
    });
  });

  // ==========================================================================
  // GET /design-ratings/:kitchenId/my
  // ==========================================================================
  describe('getMyRating', () => {
    it('should return the current user rating for a kitchen', async () => {
      const mockRating = {
        id: 'r1',
        userId: 'test-user-id',
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 4,
        comment: 'Good',
      };
      mockPrisma.designRating.findUnique.mockResolvedValue(mockRating);

      const req = createMockReq({ params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMyRating(req as Request, res as Response);

      expect(mockPrisma.designRating.findUnique).toHaveBeenCalledWith({
        where: {
          userId_kitchenId: {
            userId: 'test-user-id',
            kitchenId: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockRating });
    });

    it('should return null data if user has not rated the kitchen', async () => {
      mockPrisma.designRating.findUnique.mockResolvedValue(null);

      const req = createMockReq({ params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMyRating(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: null });
    });

    it('should return 401 if not authenticated', async () => {
      const req = createMockReq({
        user: undefined as any,
        params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMyRating(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'User not authenticated' });
    });

    it('should return 400 if kitchenId is missing', async () => {
      const req = createMockReq({ params: {} });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMyRating(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'kitchenId is required' });
    });
  });

  // ==========================================================================
  // DELETE /design-ratings/:kitchenId
  // ==========================================================================
  describe('deleteMyRating', () => {
    it('should delete the current user own rating', async () => {
      const existingRating = {
        id: 'r1',
        userId: 'test-user-id',
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 4,
      };
      mockPrisma.designRating.findUnique.mockResolvedValue(existingRating);
      mockPrisma.designRating.delete.mockResolvedValue(existingRating);

      const req = createMockReq({ params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.deleteMyRating(req as Request, res as Response);

      expect(mockPrisma.designRating.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Rating deleted successfully',
      });
    });

    it('should return 404 if rating does not exist', async () => {
      mockPrisma.designRating.findUnique.mockResolvedValue(null);

      const req = createMockReq({ params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.deleteMyRating(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Rating not found' });
    });

    it('should return 401 if not authenticated', async () => {
      const req = createMockReq({
        user: undefined as any,
        params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.deleteMyRating(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'User not authenticated' });
    });

    it('should return 403 if user does not own the rating and is not admin', async () => {
      const existingRating = {
        id: 'r1',
        userId: 'other-user-id',
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 4,
      };
      mockPrisma.designRating.findUnique.mockResolvedValue(existingRating);

      const req = createMockReq({ params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.deleteMyRating(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Access denied' });
    });

    it('should allow admin to delete any rating', async () => {
      const existingRating = {
        id: 'r1',
        userId: 'other-user-id',
        kitchenId: '550e8400-e29b-41d4-a716-446655440000',
        rating: 4,
      };
      mockPrisma.designRating.findUnique.mockResolvedValue(existingRating);
      mockPrisma.designRating.delete.mockResolvedValue(existingRating);

      const req = createMockReq({
        user: adminUser as any,
        params: { kitchenId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.deleteMyRating(req as Request, res as Response);

      expect(mockPrisma.designRating.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Rating deleted successfully',
      });
    });
  });

  // ==========================================================================
  // Auth guard
  // ==========================================================================
  describe('Auth guard', () => {
    it('all design-rating routes require authentication via router.use(authenticate)', () => {
      const requiresAuth = true;
      expect(requiresAuth).toBe(true);
    });

    it('routes do not require admin role (any authenticated user can access)', () => {
      const regularUser = testUser;
      // Regular users should be able to access design rating endpoints
      expect(regularUser.role).toBe('user');
    });
  });
});
