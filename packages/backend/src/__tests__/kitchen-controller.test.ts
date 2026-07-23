/**
 * Kitchen Controller Tests
 */

import { type Request, type Response } from 'express';

// Mock repository must be defined before jest.mock due to hoisting
const mockRepository = {
  findById: jest.fn(),
  findAll: jest.fn(),
  findByProjectId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  duplicate: jest.fn(),
  getConfiguration: jest.fn(),
  upsertConfiguration: jest.fn(),
  getItems: jest.fn(),
  addItem: jest.fn(),
  replaceItems: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  getUserStats: jest.fn(),
  findItemInKitchen: jest.fn(),
  archive: jest.fn(),
  restore: jest.fn(),
  findArchived: jest.fn(),
  getModel: jest.fn(),
  updateModelThumbnail: jest.fn(),
  exportData: jest.fn(),
  createShareLink: jest.fn(),
  findByShareId: jest.fn(),
  revokeShareLink: jest.fn(),
};

const mockProjectRepository = {
  findById: jest.fn(),
};

// Mock the kitchen repository
jest.mock('../repositories/kitchen-repository', () => ({
  KitchenRepository: jest.fn().mockImplementation(() => mockRepository),
}));

// Mock project repository (used in getByProject via dynamic import)
jest.mock('../repositories/project-repository', () => ({
  ProjectRepository: jest.fn().mockImplementation(() => mockProjectRepository),
}));

// Mock prisma client
jest.mock('../database/client', () => ({
  prisma: {},
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));

// Mock asyncHandler to pass through the function directly
jest.mock('../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: Function) => fn,
}));

// Import after mocks
import { KitchenController } from '../api/controllers/kitchen-controller';

describe('KitchenController', () => {
  let controller: KitchenController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const testUser = { userId: 'user-1', email: 'test@test.com', role: 'user' };

  beforeEach(() => {
    controller = new KitchenController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: testUser as any,
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all kitchens with pagination', async () => {
      const mockResult = {
        data: [{ id: 'k1' }, { id: 'k2' }],
        total: 2,
        page: 1,
        totalPages: 1,
      };
      mockRepository.findAll.mockResolvedValue(mockResult);

      await controller.getAll(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data,
        meta: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      });
    });

    it('should pass filters to repository', async () => {
      mockReq.query = { style: 'modern', isGenerated: 'true', page: '2', limit: '10' };
      mockRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 2, totalPages: 0 });

      await controller.getAll(mockReq as Request, mockRes as Response);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          style: 'modern',
          isGenerated: true,
        }),
        expect.objectContaining({
          page: 2,
          limit: 10,
        })
      );
    });
  });

  describe('getById', () => {
    it('should return a kitchen by ID', async () => {
      const mockKitchen = { id: 'k1', name: 'Test Kitchen', userId: 'user-1' };
      mockReq.params = { id: 'k1' };
      mockRepository.findById.mockResolvedValue(mockKitchen);

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(mockRepository.findById).toHaveBeenCalledWith('k1', true);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockKitchen,
      });
    });

    it('should return 404 if kitchen not found', async () => {
      mockReq.params = { id: '00000000-0000-0000-0000-000000000000' };
      mockRepository.findById.mockResolvedValue(null);

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Kitchen not found',
      });
    });

    it('should return 400 if ID is missing', async () => {
      mockReq.params = {};

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Kitchen ID is required',
      });
    });

    it('should return 403 if kitchen owned by another user', async () => {
      const mockKitchen = { id: 'k1', name: 'Other Kitchen', userId: 'other-user' };
      mockReq.params = { id: 'k1' };
      mockRepository.findById.mockResolvedValue(mockKitchen);

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('create', () => {
    it('should create a new kitchen', async () => {
      const createData = {
        projectId: 'p1',
        name: 'New Kitchen',
        width: 400,
        length: 300,
      };
      mockReq.body = createData;

      const mockCreated = { id: 'new-k', ...createData, userId: 'user-1' };
      mockRepository.create.mockResolvedValue(mockCreated);

      await controller.create(mockReq as Request, mockRes as Response);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'p1',
          userId: 'user-1',
          name: 'New Kitchen',
        })
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockCreated,
        message: 'Kitchen created successfully',
      });
    });

    it('should return 401 if user not authenticated', async () => {
      (mockReq as any).user = undefined;

      await controller.create(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated',
      });
    });
  });

  describe('update', () => {
    it('should update a kitchen', async () => {
      mockReq.params = { id: 'k1' };
      mockReq.body = { name: 'Updated Kitchen' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'k1', userId: 'user-1' });

      const mockUpdated = { id: 'k1', name: 'Updated Kitchen' };
      mockRepository.update.mockResolvedValue(mockUpdated);

      await controller.update(mockReq as Request, mockRes as Response);

      expect(mockRepository.update).toHaveBeenCalledWith(
        'k1',
        expect.objectContaining({ name: 'Updated Kitchen' })
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockUpdated,
        message: 'Kitchen updated successfully',
      });
    });
  });

  describe('setItems', () => {
    const items = [
      {
        type: 'base_cabinet',
        positionX: 50,
        positionY: 40,
        positionZ: -190,
        rotationY: 0,
        width: 60,
        depth: 60,
        height: 80,
      },
    ];

    it('replaces the kitchen items for the owner', async () => {
      mockReq.params = { id: 'k1' };
      mockReq.body = { items };
      mockRepository.findById.mockResolvedValue({ id: 'k1', userId: 'user-1' });
      mockRepository.replaceItems.mockResolvedValue({ count: 1 });

      await controller.setItems(mockReq as Request, mockRes as Response);

      expect(mockRepository.replaceItems).toHaveBeenCalledWith('k1', items);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { count: 1 },
        message: 'Items saved',
      });
    });

    it('refuses to touch a kitchen owned by someone else (IDOR guard)', async () => {
      mockReq.params = { id: 'k1' };
      mockReq.body = { items };
      // kitchen belongs to another user
      mockRepository.findById.mockResolvedValue({ id: 'k1', userId: 'someone-else' });

      await controller.setItems(mockReq as Request, mockRes as Response);

      // Load-bearing: the write must NOT happen, and the response is 403 — not 200.
      expect(mockRepository.replaceItems).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('delete', () => {
    it('should delete a kitchen', async () => {
      mockReq.params = { id: 'k1' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'k1', userId: 'user-1' });
      mockRepository.delete.mockResolvedValue({ id: 'k1' });

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(mockRepository.delete).toHaveBeenCalledWith('k1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Kitchen deleted successfully',
      });
    });
  });

  describe('duplicate', () => {
    it('should duplicate a kitchen', async () => {
      mockReq.params = { id: 'k1' };
      mockReq.body = { name: 'Duplicated Kitchen' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'k1', userId: 'user-1' });

      const mockDuplicated = { id: 'k2', name: 'Duplicated Kitchen' };
      mockRepository.duplicate.mockResolvedValue(mockDuplicated);

      await controller.duplicate(mockReq as Request, mockRes as Response);

      expect(mockRepository.duplicate).toHaveBeenCalledWith('k1', 'Duplicated Kitchen');
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('getConfiguration', () => {
    it('should get kitchen configuration', async () => {
      mockReq.params = { id: 'k1' };
      const mockConfig = { kitchenId: 'k1', wallColor: '#FFF' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'k1', userId: 'user-1' });
      mockRepository.getConfiguration.mockResolvedValue(mockConfig);

      await controller.getConfiguration(mockReq as Request, mockRes as Response);

      expect(mockRepository.getConfiguration).toHaveBeenCalledWith('k1');
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('getItems', () => {
    it('should get kitchen items', async () => {
      mockReq.params = { id: 'k1' };
      const mockItems = [{ id: 'item1' }, { id: 'item2' }];

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'k1', userId: 'user-1' });
      mockRepository.getItems.mockResolvedValue(mockItems);

      await controller.getItems(mockReq as Request, mockRes as Response);

      expect(mockRepository.getItems).toHaveBeenCalledWith('k1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockItems,
      });
    });
  });

  describe('addItem', () => {
    it('should add an item to kitchen', async () => {
      mockReq.params = { id: 'k1' };
      mockReq.body = { type: 'cabinet', name: 'Base Cabinet' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'k1', userId: 'user-1' });

      const mockItem = { id: 'item1', kitchenId: 'k1', type: 'cabinet' };
      mockRepository.addItem.mockResolvedValue(mockItem);

      await controller.addItem(mockReq as Request, mockRes as Response);

      expect(mockRepository.addItem).toHaveBeenCalledWith('k1', mockReq.body);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from kitchen', async () => {
      mockReq.params = { kitchenId: 'k1', itemId: 'item1' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'k1', userId: 'user-1' });
      // Setup item existence check
      mockRepository.findItemInKitchen.mockResolvedValue({ id: 'item1' });
      mockRepository.removeItem.mockResolvedValue({ id: 'item1' });

      await controller.removeItem(mockReq as Request, mockRes as Response);

      expect(mockRepository.removeItem).toHaveBeenCalledWith('item1');
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('getStats', () => {
    it('should get user kitchen statistics', async () => {
      const mockStats = {
        totalKitchens: 5,
        generatedKitchens: 2,
        averageScore: 8.5,
        styleBreakdown: { modern: 3, traditional: 2 },
      };
      mockRepository.getUserStats.mockResolvedValue(mockStats);

      await controller.getStats(mockReq as Request, mockRes as Response);

      expect(mockRepository.getUserStats).toHaveBeenCalledWith('user-1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });
  });

  describe('getByProject', () => {
    it('should get kitchens by project', async () => {
      mockReq.params = { projectId: 'p1' };
      const mockKitchens = [{ id: 'k1' }, { id: 'k2' }];

      // Setup project ownership verification
      mockProjectRepository.findById.mockResolvedValue({ id: 'p1', userId: 'user-1' });
      mockRepository.findByProjectId.mockResolvedValue(mockKitchens);

      await controller.getByProject(mockReq as Request, mockRes as Response);

      expect(mockRepository.findByProjectId).toHaveBeenCalledWith('p1');
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });
});
