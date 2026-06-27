/**
 * Project Controller Tests
 */

import { type Request, type Response } from 'express';

// Mock repository must be defined before jest.mock due to hoisting
const mockRepository = {
  findById: jest.fn(),
  findAll: jest.fn(),
  findByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  duplicate: jest.fn(),
  getUserStats: jest.fn(),
  addCollaborator: jest.fn(),
  removeCollaborator: jest.fn(),
  getCollaborators: jest.fn(),
  updateStatus: jest.fn(),
  findByCollaborator: jest.fn(),
  acceptInvite: jest.fn(),
};

// Mock the repository
jest.mock('../repositories/project-repository', () => ({
  ProjectRepository: jest.fn().mockImplementation(() => mockRepository),
}));

// Mock prisma client
jest.mock('../database/client', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));

// Mock asyncHandler to pass through the function directly
jest.mock('../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: Function) => fn,
}));

// Mock mail service
jest.mock('../services/mail.service', () => ({
  getMailService: jest.fn(() => ({
    sendProjectShared: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock config
jest.mock('../config/app-config', () => ({
  config: {
    corsOrigins: ['http://localhost:3000'],
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocks
import { ProjectController } from '../api/controllers/project-controller';

describe('ProjectController', () => {
  let controller: ProjectController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const testUser = { userId: 'user-1', email: 'test@test.com', role: 'user' };

  beforeEach(() => {
    controller = new ProjectController();
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
    it('should return all projects with pagination', async () => {
      const mockResult = {
        data: [{ id: 'p1' }, { id: 'p2' }],
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
        meta: expect.objectContaining({
          total: 2,
        }),
      });
    });

    it('should filter by status when provided', async () => {
      mockReq.query = { status: 'draft' };
      mockRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 });

      await controller.getAll(mockReq as Request, mockRes as Response);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'draft',
        }),
        expect.any(Object)
      );
    });
  });

  describe('getById', () => {
    it('should return a project by ID', async () => {
      const mockProject = { id: 'p1', name: 'Test Project', userId: 'user-1' };
      mockReq.params = { id: 'p1' };
      mockRepository.findById.mockResolvedValue(mockProject);

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(mockRepository.findById).toHaveBeenCalledWith('p1', true);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockProject,
      });
    });

    it('should return 404 if project not found', async () => {
      mockReq.params = { id: '00000000-0000-0000-0000-000000000000' };
      mockRepository.findById.mockResolvedValue(null);

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Project not found',
      });
    });
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const createData = {
        name: 'New Project',
        description: 'Project description',
      };
      mockReq.body = createData;

      const mockCreated = { id: 'new-p', ...createData, userId: 'user-1' };
      mockRepository.create.mockResolvedValue(mockCreated);

      await controller.create(mockReq as Request, mockRes as Response);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          name: 'New Project',
        })
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockCreated,
        message: 'Project created successfully',
      });
    });

    it('should return 401 if user not authenticated', async () => {
      (mockReq as any).user = undefined;
      mockReq.body = { name: 'New Project' };

      await controller.create(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated',
      });
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      mockReq.params = { id: 'p1' };
      mockReq.body = { name: 'Updated Project' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'p1', userId: 'user-1' });

      const mockUpdated = { id: 'p1', name: 'Updated Project' };
      mockRepository.update.mockResolvedValue(mockUpdated);

      await controller.update(mockReq as Request, mockRes as Response);

      expect(mockRepository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ name: 'Updated Project' })
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockUpdated,
        message: 'Project updated successfully',
      });
    });
  });

  describe('delete', () => {
    it('should delete a project', async () => {
      mockReq.params = { id: 'p1' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'p1', userId: 'user-1' });
      mockRepository.delete.mockResolvedValue({ id: 'p1' });

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(mockRepository.delete).toHaveBeenCalledWith('p1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Project deleted successfully',
      });
    });
  });

  describe('duplicate', () => {
    it('should duplicate a project', async () => {
      mockReq.params = { id: 'p1' };
      mockReq.body = { name: 'Duplicated Project' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'p1', userId: 'user-1' });

      const mockDuplicated = { id: 'p2', name: 'Duplicated Project' };
      mockRepository.duplicate.mockResolvedValue(mockDuplicated);

      await controller.duplicate(mockReq as Request, mockRes as Response);

      expect(mockRepository.duplicate).toHaveBeenCalledWith('p1', 'Duplicated Project');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockDuplicated,
        message: 'Project duplicated successfully',
      });
    });
  });

  describe('getStats', () => {
    it('should get user project statistics', async () => {
      const mockStats = {
        total: 5,
        byStatus: { draft: 2, in_progress: 3 },
        avgBudget: 15000,
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

  describe('addCollaborator', () => {
    it('should add a collaborator to project', async () => {
      mockReq.params = { id: 'p1' };
      mockReq.body = { email: 'collaborator@example.com', role: 'editor' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'p1', name: 'Project 1', userId: 'user-1' });
      mockRepository.addCollaborator.mockResolvedValue({
        projectId: 'p1',
        email: 'collaborator@example.com',
      });

      await controller.addCollaborator(mockReq as Request, mockRes as Response);

      expect(mockRepository.addCollaborator).toHaveBeenCalledWith(
        'p1',
        'collaborator@example.com',
        'editor'
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('removeCollaborator', () => {
    it('should remove a collaborator from project', async () => {
      mockReq.params = { id: 'p1', email: 'collaborator@example.com' };

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'p1', userId: 'user-1' });
      mockRepository.removeCollaborator.mockResolvedValue({});

      await controller.removeCollaborator(mockReq as Request, mockRes as Response);

      expect(mockRepository.removeCollaborator).toHaveBeenCalledWith(
        'p1',
        'collaborator@example.com'
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('getCollaborators', () => {
    it('should get project collaborators', async () => {
      mockReq.params = { id: 'p1' };
      const mockCollaborators = [
        { email: 'user2@example.com', role: 'editor' },
        { email: 'user3@example.com', role: 'viewer' },
      ];

      // Setup ownership verification
      mockRepository.findById.mockResolvedValue({ id: 'p1', userId: 'user-1' });
      mockRepository.getCollaborators.mockResolvedValue(mockCollaborators);

      await controller.getCollaborators(mockReq as Request, mockRes as Response);

      expect(mockRepository.getCollaborators).toHaveBeenCalledWith('p1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockCollaborators,
      });
    });
  });
});
