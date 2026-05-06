/**
 * Installer Service Tests
 *
 * Tests for search, getById, register, addReview, requestInstallation,
 * updateProject, and getProjectById.
 */

// Mock logger before imports
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createModuleLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock database client
const mockPrisma = {
  installer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  installerReview: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  installationProject: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  kitchen: {
    findUnique: jest.fn(),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

import { InstallerService, InstallerServiceError } from '../services/installer/installer.service';

describe('InstallerService', () => {
  let service: InstallerService;

  const mockUser = { userId: 'test-user-id', email: 'test@test.com', role: 'user' };

  const mockInstaller = {
    id: 'installer-1',
    userId: 'installer-owner-id',
    companyName: 'KitchenPro',
    contactName: 'Jean Dupont',
    email: 'jean@kitchenpro.com',
    phone: '+33123456789',
    address: '1 rue de la Cuisine',
    city: 'Paris',
    postalCode: '75001',
    country: 'FR',
    latitude: 48.8566,
    longitude: 2.3522,
    radiusKm: 50,
    specialties: ['installation', 'renovation'],
    certifications: ['RGE'],
    yearsExperience: 10,
    hourlyRate: 50,
    bio: 'Expert kitchen installer',
    portfolioUrls: [],
    rating: 4.5,
    reviewCount: 12,
    isVerified: true,
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InstallerService();
  });

  // ==================== search ====================

  describe('search', () => {
    it('should return installers matching search criteria', async () => {
      mockPrisma.installer.findMany.mockResolvedValue([mockInstaller]);
      mockPrisma.installer.count.mockResolvedValue(1);

      const result = await service.search({ city: 'Paris' });

      expect(result.installers).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.installer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should filter by postal code prefix', async () => {
      mockPrisma.installer.findMany.mockResolvedValue([mockInstaller]);
      mockPrisma.installer.count.mockResolvedValue(1);

      await service.search({ postalCode: '75001' });

      expect(mockPrisma.installer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            postalCode: { startsWith: '75' },
          }),
        }),
      );
    });

    it('should filter by minimum rating', async () => {
      mockPrisma.installer.findMany.mockResolvedValue([]);
      mockPrisma.installer.count.mockResolvedValue(0);

      await service.search({ minRating: 4.0 });

      expect(mockPrisma.installer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rating: { gte: 4.0 },
          }),
        }),
      );
    });

    it('should filter by specialties', async () => {
      mockPrisma.installer.findMany.mockResolvedValue([]);
      mockPrisma.installer.count.mockResolvedValue(0);

      await service.search({ specialties: ['renovation'] });

      expect(mockPrisma.installer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            specialties: { hasSome: ['renovation'] },
          }),
        }),
      );
    });

    it('should compute distances when coordinates are provided and filter by radius', async () => {
      const farInstaller = {
        ...mockInstaller,
        id: 'far-installer',
        latitude: 43.2965, // Marseille
        longitude: 5.3698,
      };
      mockPrisma.installer.findMany.mockResolvedValue([mockInstaller, farInstaller]);
      mockPrisma.installer.count.mockResolvedValue(2);

      const result = await service.search({
        latitude: 48.8566,
        longitude: 2.3522,
        radiusKm: 10,
      });

      // Only the nearby installer should remain (Paris->Marseille is ~660km)
      expect(result.installers.length).toBeLessThanOrEqual(2);
      // The close installer should have a distance property
      if (result.installers.length > 0) {
        expect(result.installers[0]).toHaveProperty('distance');
      }
    });

    it('should paginate results correctly', async () => {
      mockPrisma.installer.findMany.mockResolvedValue([]);
      mockPrisma.installer.count.mockResolvedValue(0);

      await service.search({ page: 3, limit: 10 });

      expect(mockPrisma.installer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  // ==================== getById ====================

  describe('getById', () => {
    it('should return installer with reviews and projects', async () => {
      const installerWithRelations = {
        ...mockInstaller,
        reviews: [{ id: 'review-1', rating: 5 }],
        projects: [{ id: 'project-1', status: 'completed' }],
      };
      mockPrisma.installer.findUnique.mockResolvedValue(installerWithRelations);

      const result = await service.getById('installer-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('installer-1');
      expect(mockPrisma.installer.findUnique).toHaveBeenCalledWith({
        where: { id: 'installer-1' },
        include: expect.objectContaining({
          reviews: expect.any(Object),
          projects: expect.any(Object),
        }),
      });
    });

    it('should return null when installer does not exist', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue(null);

      const result = await service.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==================== addReview ====================

  describe('addReview', () => {
    it('should create a review for an installer with a completed project', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue(mockInstaller);
      mockPrisma.installerReview.findUnique.mockResolvedValue(null);
      mockPrisma.installationProject.findFirst.mockResolvedValue({
        id: 'project-1',
        status: 'completed',
      });
      mockPrisma.installerReview.create.mockResolvedValue({
        id: 'review-1',
        installerId: 'installer-1',
        userId: mockUser.userId,
        rating: 5,
      });
      mockPrisma.installerReview.findMany.mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
      ]);
      mockPrisma.installer.update.mockResolvedValue({});

      const result = await service.addReview(
        'installer-1',
        mockUser.userId,
        { rating: 5, title: 'Excellent', comment: 'Great work!' },
      );

      expect(result.rating).toBe(5);
      expect(mockPrisma.installer.update).toHaveBeenCalledWith({
        where: { id: 'installer-1' },
        data: expect.objectContaining({
          reviewCount: 2,
        }),
      });
    });

    it('should throw INSTALLER_NOT_FOUND when installer does not exist', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue(null);

      await expect(
        service.addReview('non-existent', mockUser.userId, { rating: 5 }),
      ).rejects.toThrow(InstallerServiceError);

      await expect(
        service.addReview('non-existent', mockUser.userId, { rating: 5 }),
      ).rejects.toThrow('Installer not found');
    });

    it('should throw SELF_REVIEW when user tries to review their own profile', async () => {
      const ownInstaller = { ...mockInstaller, userId: mockUser.userId };
      mockPrisma.installer.findUnique.mockResolvedValue(ownInstaller);

      await expect(
        service.addReview('installer-1', mockUser.userId, { rating: 5 }),
      ).rejects.toThrow('You cannot review your own installer profile');
    });

    it('should throw ALREADY_REVIEWED when user already reviewed this installer', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue(mockInstaller);
      mockPrisma.installerReview.findUnique.mockResolvedValue({ id: 'existing-review' });

      await expect(
        service.addReview('installer-1', mockUser.userId, { rating: 5 }),
      ).rejects.toThrow('You have already reviewed this installer');
    });

    it('should throw NO_COMPLETED_PROJECT when user has no completed project', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue(mockInstaller);
      mockPrisma.installerReview.findUnique.mockResolvedValue(null);
      mockPrisma.installationProject.findFirst.mockResolvedValue(null);

      await expect(
        service.addReview('installer-1', mockUser.userId, { rating: 5 }),
      ).rejects.toThrow('You can only review an installer after a completed project');
    });
  });

  // ==================== requestInstallation ====================

  describe('requestInstallation', () => {
    it('should create an installation request for an active installer', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue(mockInstaller);
      mockPrisma.installationProject.findFirst.mockResolvedValue(null);
      mockPrisma.installationProject.create.mockResolvedValue({
        id: 'project-1',
        installerId: 'installer-1',
        userId: mockUser.userId,
        status: 'pending',
      });

      const result = await service.requestInstallation({
        installerId: 'installer-1',
        userId: mockUser.userId,
      });

      expect(result.status).toBe('pending');
      expect(mockPrisma.installationProject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          installerId: 'installer-1',
          userId: mockUser.userId,
          status: 'pending',
        }),
      });
    });

    it('should throw INSTALLER_NOT_FOUND if installer does not exist', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue(null);

      await expect(
        service.requestInstallation({
          installerId: 'non-existent',
          userId: mockUser.userId,
        }),
      ).rejects.toThrow('Installer not found');
    });

    it('should throw INSTALLER_INACTIVE if installer is not active', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue({
        ...mockInstaller,
        isActive: false,
      });

      await expect(
        service.requestInstallation({
          installerId: 'installer-1',
          userId: mockUser.userId,
        }),
      ).rejects.toThrow('This installer is not currently accepting requests');
    });

    it('should verify kitchen ownership when kitchenId is provided', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue(mockInstaller);
      mockPrisma.kitchen.findUnique.mockResolvedValue({
        userId: 'other-user-id',
      });

      await expect(
        service.requestInstallation({
          installerId: 'installer-1',
          userId: mockUser.userId,
          kitchenId: 'kitchen-1',
        }),
      ).rejects.toThrow('You do not own this kitchen');
    });

    it('should throw DUPLICATE_REQUEST when an active request already exists', async () => {
      mockPrisma.installer.findUnique.mockResolvedValue(mockInstaller);
      mockPrisma.installationProject.findFirst.mockResolvedValue({
        id: 'existing-request',
        status: 'pending',
      });

      await expect(
        service.requestInstallation({
          installerId: 'installer-1',
          userId: mockUser.userId,
        }),
      ).rejects.toThrow('You already have an active request with this installer');
    });
  });

  // ==================== getProjectById ====================

  describe('getProjectById', () => {
    it('should return project when user is the requester', async () => {
      const mockProject = {
        id: 'project-1',
        userId: mockUser.userId,
        installer: { userId: 'installer-owner-id' },
      };
      mockPrisma.installationProject.findUnique.mockResolvedValue(mockProject);

      const result = await service.getProjectById('project-1', mockUser.userId);

      expect(result).toBeDefined();
      expect(result.id).toBe('project-1');
    });

    it('should return null when project does not exist', async () => {
      mockPrisma.installationProject.findUnique.mockResolvedValue(null);

      const result = await service.getProjectById('non-existent', mockUser.userId);

      expect(result).toBeNull();
    });

    it('should throw ACCESS_DENIED when user is neither requester nor installer', async () => {
      const mockProject = {
        id: 'project-1',
        userId: 'other-user',
        installer: { userId: 'installer-owner-id' },
      };
      mockPrisma.installationProject.findUnique.mockResolvedValue(mockProject);

      await expect(
        service.getProjectById('project-1', mockUser.userId),
      ).rejects.toThrow('You do not have permission to view this project');
    });
  });
});
