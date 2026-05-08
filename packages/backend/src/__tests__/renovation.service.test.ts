/**
 * Renovation Service Tests
 *
 * Tests for AI-powered kitchen renovation analysis:
 * - createProject (create renovation project in DB)
 * - analyzeExistingKitchen (mock Claude Vision)
 * - getProject (with ownership verification)
 * - listUserProjects
 * - generateComparison (mock Claude)
 * - updateProject
 */

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  renovationProject: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  kitchen: {
    findUnique: jest.fn(),
  },
  aIUsageLog: {
    create: jest.fn(),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// ---------------------------------------------------------------------------
// Mock AnthropicService
// ---------------------------------------------------------------------------
const mockGenerateJSON = jest.fn();
const mockLogUsage = jest.fn();

jest.mock('../services/ai/anthropic.service', () => ({
  AnthropicService: {
    getInstance: jest.fn(() => ({
      generateJSON: mockGenerateJSON,
      logUsage: mockLogUsage,
    })),
  },
}));

// ---------------------------------------------------------------------------
// Mock prompt templates
// ---------------------------------------------------------------------------
jest.mock('../services/ai/prompt-templates', () => ({
  SYSTEM_PROMPTS: {
    RENOVATION_ANALYZER: 'You are a renovation analyzer.',
  },
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
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { RenovationService } from '../services/ai/renovation.service';

import type { ExistingKitchenAnalysis } from '../services/ai/renovation.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const testUserId = 'test-user-id';
const otherUserId = 'other-user-99';

const mockAnalysisResult: ExistingKitchenAnalysis = {
  cabinets: [
    { type: 'bas', style: 'moderne laque blanc', condition: 'fair', estimatedCount: 6 },
  ],
  appliances: [
    { type: 'four', builtin: true, condition: 'good' },
  ],
  countertop: { material: 'granit', condition: 'fair', estimatedLengthM: 3.5 },
  flooring: { material: 'carrelage', condition: 'good' },
  wallCovering: { type: 'peinture', condition: 'poor' },
  plumbing: { visible: true, condition: 'fair', notes: 'Tuyaux visibles sous evier' },
  overallCondition: 'partial_renovation',
  elementsToKeep: ['carrelage sol', 'four encastre'],
  elementsToReplace: ['meubles hauts', 'plan de travail', 'credence'],
  estimatedDemolitionCostEur: 1200,
  notes: ['Etat general correct, renovation partielle conseillee'],
  confidence: 0.85,
};

const mockComparisonResult = {
  storageSpaceChange: 25,
  counterSpaceChange: 15,
  estimatedDemolitionCostEur: 1200,
  estimatedRenovationCostEur: 12000,
  totalCostEur: 13200,
  improvements: ['Plus d\'espace de rangement', 'Plan de travail plus grand'],
  summary: 'La renovation apportera 25% de rangement en plus.',
};

const mockProject = {
  id: 'project-1',
  userId: testUserId,
  kitchenId: 'kitchen-1',
  beforePhotos: [],
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockKitchen = {
  id: 'kitchen-1',
  name: 'Ma cuisine',
  description: 'Cuisine en L',
  data: { style: 'modern', layout: 'L-shape' },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RenovationService', () => {
  let service: RenovationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RenovationService();
  });

  // ==================== createProject ====================

  describe('createProject', () => {
    it('should create a renovation project with default status "draft"', async () => {
      mockPrisma.renovationProject.create.mockResolvedValue(mockProject);

      const result = await service.createProject(testUserId, {
        kitchenId: 'kitchen-1',
        beforePhotos: ['photo1.jpg'],
      });

      expect(result).toEqual(mockProject);
      expect(mockPrisma.renovationProject.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          kitchenId: 'kitchen-1',
          beforePhotos: ['photo1.jpg'],
          status: 'draft',
        },
      });
    });

    it('should create a project without kitchenId or photos', async () => {
      mockPrisma.renovationProject.create.mockResolvedValue({
        ...mockProject,
        kitchenId: null,
        beforePhotos: [],
      });

      const result = await service.createProject(testUserId, {});

      expect(mockPrisma.renovationProject.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          kitchenId: null,
          beforePhotos: [],
          status: 'draft',
        },
      });
      expect(result).toBeDefined();
    });
  });

  // ==================== getProject ====================

  describe('getProject', () => {
    it('should return a project owned by the user', async () => {
      mockPrisma.renovationProject.findUnique.mockResolvedValue(mockProject);

      const result = await service.getProject('project-1', testUserId, false);

      expect(result).toEqual(mockProject);
      expect(mockPrisma.renovationProject.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
    });

    it('should return null when project is not found (404)', async () => {
      mockPrisma.renovationProject.findUnique.mockResolvedValue(null);

      const result = await service.getProject('nonexistent', testUserId, false);

      expect(result).toBeNull();
    });

    it('should return null when user does not own the project (IDOR prevention)', async () => {
      mockPrisma.renovationProject.findUnique.mockResolvedValue(mockProject);

      const result = await service.getProject('project-1', otherUserId, false);

      expect(result).toBeNull();
    });

    it('should allow admin to access any project', async () => {
      mockPrisma.renovationProject.findUnique.mockResolvedValue(mockProject);

      const result = await service.getProject('project-1', otherUserId, true);

      expect(result).toEqual(mockProject);
    });
  });

  // ==================== listUserProjects ====================

  describe('listUserProjects', () => {
    it('should return all projects for the user ordered by createdAt desc', async () => {
      const projects = [mockProject, { ...mockProject, id: 'project-2' }];
      mockPrisma.renovationProject.findMany.mockResolvedValue(projects);

      const result = await service.listUserProjects(testUserId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.renovationProject.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no projects', async () => {
      mockPrisma.renovationProject.findMany.mockResolvedValue([]);

      const result = await service.listUserProjects(testUserId);

      expect(result).toEqual([]);
    });
  });

  // ==================== analyzeExistingKitchen ====================

  describe('analyzeExistingKitchen', () => {
    it('should analyze a kitchen photo via Claude Vision and return structured analysis', async () => {
      mockGenerateJSON.mockResolvedValue({
        data: mockAnalysisResult,
        inputTokens: 2000,
        outputTokens: 800,
      });
      mockLogUsage.mockResolvedValue(undefined);

      const photo = Buffer.alloc(200, 0xff);
      const result = await service.analyzeExistingKitchen(photo, testUserId, 'image/jpeg');

      expect(result).toEqual(mockAnalysisResult);
      expect(result.overallCondition).toBe('partial_renovation');
      expect(result.confidence).toBe(0.85);
      expect(mockGenerateJSON).toHaveBeenCalledTimes(1);
      expect(mockLogUsage).toHaveBeenCalledWith(
        testUserId,
        'anthropic',
        'claude-sonnet-4-5-20250929',
        2000,
        800,
        expect.any(Number),
        expect.objectContaining({ feature: 'renovation-analyzer' }),
      );
    });

    it('should throw an error when image data is too small', async () => {
      const tinyPhoto = Buffer.alloc(50, 0xff);

      await expect(
        service.analyzeExistingKitchen(tinyPhoto, testUserId),
      ).rejects.toThrow('Invalid image data: image is too small or empty');

      expect(mockGenerateJSON).not.toHaveBeenCalled();
    });

    it('should propagate errors from the AI service', async () => {
      mockGenerateJSON.mockRejectedValue(new Error('AI service unavailable'));

      const photo = Buffer.alloc(200, 0xff);

      await expect(
        service.analyzeExistingKitchen(photo, testUserId),
      ).rejects.toThrow('AI service unavailable');
    });
  });

  // ==================== generateComparison ====================

  describe('generateComparison', () => {
    it('should generate a comparison between existing analysis and new design', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockGenerateJSON.mockResolvedValue({
        data: mockComparisonResult,
        inputTokens: 1500,
        outputTokens: 600,
      });

      const result = await service.generateComparison(mockAnalysisResult, 'kitchen-1');

      expect(result).toEqual(mockComparisonResult);
      expect(result.totalCostEur).toBe(13200);
      expect(result.improvements).toHaveLength(2);
      expect(mockPrisma.kitchen.findUnique).toHaveBeenCalledWith({
        where: { id: 'kitchen-1' },
        select: { id: true, name: true, description: true, data: true },
      });
      expect(mockGenerateJSON).toHaveBeenCalledTimes(1);
    });

    it('should throw when kitchen design is not found', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(null);

      await expect(
        service.generateComparison(mockAnalysisResult, 'nonexistent-kitchen'),
      ).rejects.toThrow('Kitchen design nonexistent-kitchen not found');

      expect(mockGenerateJSON).not.toHaveBeenCalled();
    });

    it('should propagate AI service errors during comparison', async () => {
      mockPrisma.kitchen.findUnique.mockResolvedValue(mockKitchen);
      mockGenerateJSON.mockRejectedValue(new Error('JSON parse failed'));

      await expect(
        service.generateComparison(mockAnalysisResult, 'kitchen-1'),
      ).rejects.toThrow('JSON parse failed');
    });
  });

  // ==================== updateProject ====================

  describe('updateProject', () => {
    it('should update project with analysis results', async () => {
      const updatedProject = {
        ...mockProject,
        detectedLayout: mockAnalysisResult,
        status: 'analyzed',
      };
      mockPrisma.renovationProject.update.mockResolvedValue(updatedProject);

      const result = await service.updateProject('project-1', {
        detectedLayout: mockAnalysisResult,
        status: 'analyzed',
        estimatedDemoCost: 1200,
      });

      expect(result).toEqual(updatedProject);
      expect(mockPrisma.renovationProject.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          detectedLayout: mockAnalysisResult,
          status: 'analyzed',
          estimatedDemoCost: 1200,
        }),
      });
    });

    it('should only include defined fields in the update', async () => {
      mockPrisma.renovationProject.update.mockResolvedValue(mockProject);

      await service.updateProject('project-1', {
        status: 'completed',
      });

      const callArgs = mockPrisma.renovationProject.update.mock.calls[0][0];
      expect(callArgs.data).toHaveProperty('status', 'completed');
      expect(callArgs.data).not.toHaveProperty('detectedLayout');
      expect(callArgs.data).not.toHaveProperty('afterDesignId');
    });
  });
});
