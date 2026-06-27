import { prisma } from '../../database/client';
import logger from '../../utils/logger';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface SearchInstallersParams {
  postalCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  specialties?: string[];
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface RegisterInstallerDto {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  postalCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  specialties?: string[];
  certifications?: string[];
  yearsExperience?: number;
  hourlyRate?: number;
  bio?: string;
  portfolioUrls?: string[];
}

export interface AddReviewDto {
  rating: number;
  title?: string;
  comment?: string;
  photos?: string[];
}

export interface UpdateProjectDto {
  status?: string;
  estimatedCost?: number;
  finalCost?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  dxfFileUrl?: string;
  bomFileUrl?: string;
}

export interface AddMilestoneDto {
  name: string;
  description?: string;
  date?: string;
  photos?: string[];
}

export interface RequestInstallationParams {
  installerId: string;
  userId: string;
  kitchenId?: string;
  projectId?: string;
  notes?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class InstallerService {
  /**
   * Search installers by location, specialties, and rating.
   * When latitude/longitude are provided, results are filtered and sorted by distance.
   */
  async search(params: SearchInstallersParams): Promise<{
    installers: any[];
    total: number;
  }> {
    const {
      postalCode,
      city,
      latitude,
      longitude,
      radiusKm = 50,
      specialties,
      minRating,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    // Build Prisma where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (postalCode) {
      where.postalCode = { startsWith: postalCode.substring(0, 2) };
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (minRating !== undefined && minRating > 0) {
      where.rating = { gte: minRating };
    }

    if (specialties && specialties.length > 0) {
      where.specialties = { hasSome: specialties };
    }

    const [installers, total] = await Promise.all([
      prisma.installer.findMany({
        where: where as any,
        orderBy: { rating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.installer.count({ where: where as any }),
    ]);

    // If coordinates provided, compute distances and filter by radius
    if (latitude !== undefined && longitude !== undefined) {
      const withDistance = installers
        .map((installer) => {
          const dist =
            installer.latitude !== null && installer.longitude !== null
              ? this.calculateDistanceKm(
                  latitude,
                  longitude,
                  installer.latitude,
                  installer.longitude
                )
              : null;
          return { ...installer, distance: dist };
        })
        .filter((inst) => inst.distance === null || inst.distance <= radiusKm)
        .sort((a, b) => {
          if (a.distance === null) {
            return 1;
          }
          if (b.distance === null) {
            return -1;
          }
          return a.distance - b.distance;
        });

      return { installers: withDistance, total: withDistance.length };
    }

    return { installers, total };
  }

  /**
   * Get a single installer profile with reviews.
   */
  async getById(id: string): Promise<any> {
    const installer = await prisma.installer.findUnique({
      where: { id },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        projects: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!installer) {
      return null;
    }

    return installer;
  }

  /**
   * Register the current user as an installer.
   */
  async register(userId: string, data: RegisterInstallerDto): Promise<any> {
    // Check if user already has an installer profile
    const existing = await prisma.installer.findFirst({
      where: { userId },
    });

    if (existing) {
      throw new InstallerServiceError(
        'ALREADY_REGISTERED',
        'You already have an installer profile'
      );
    }

    // Check if email is already taken by another installer
    const existingEmail = await prisma.installer.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new InstallerServiceError(
        'EMAIL_TAKEN',
        'An installer profile with this email already exists'
      );
    }

    const installer = await prisma.installer.create({
      data: {
        userId,
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone || null,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country || 'FR',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        radiusKm: data.radiusKm ?? 50,
        specialties: data.specialties || [],
        certifications: data.certifications || [],
        yearsExperience: data.yearsExperience ?? 0,
        hourlyRate: data.hourlyRate ?? null,
        bio: data.bio || null,
        portfolioUrls: data.portfolioUrls || [],
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        isActive: true,
      },
    });

    logger.info('[INSTALLER] New installer registered', {
      installerId: installer.id,
      userId,
      companyName: data.companyName,
    });

    return installer;
  }

  /**
   * Add a review for an installer.
   * The user must have a completed project with the installer.
   */
  async addReview(installerId: string, userId: string, data: AddReviewDto): Promise<any> {
    // Verify installer exists
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
    });

    if (!installer) {
      throw new InstallerServiceError('INSTALLER_NOT_FOUND', 'Installer not found');
    }

    // Prevent self-review
    if (installer.userId === userId) {
      throw new InstallerServiceError(
        'SELF_REVIEW',
        'You cannot review your own installer profile'
      );
    }

    // Check for existing review
    const existingReview = await prisma.installerReview.findUnique({
      where: {
        installerId_userId: { installerId, userId },
      },
    });

    if (existingReview) {
      throw new InstallerServiceError(
        'ALREADY_REVIEWED',
        'You have already reviewed this installer'
      );
    }

    // Check user has a completed project with this installer
    const completedProject = await prisma.installationProject.findFirst({
      where: {
        installerId,
        userId,
        status: 'completed',
      },
    });

    if (!completedProject) {
      throw new InstallerServiceError(
        'NO_COMPLETED_PROJECT',
        'You can only review an installer after a completed project'
      );
    }

    // Create review
    const review = await prisma.installerReview.create({
      data: {
        installerId,
        userId,
        projectId: completedProject.id,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment || null,
        photos: data.photos || [],
        isVerified: true, // verified because we confirmed a completed project
      },
    });

    // Recalculate installer rating
    const reviews = await prisma.installerReview.findMany({
      where: { installerId },
      select: { rating: true },
    });

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.installer.update({
      where: { id: installerId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
      },
    });

    logger.info('[INSTALLER] Review added', {
      installerId,
      userId,
      rating: data.rating,
    });

    return review;
  }

  /**
   * Create an installation project request.
   */
  async requestInstallation(params: RequestInstallationParams): Promise<any> {
    const { installerId, userId, kitchenId, projectId, notes } = params;

    // Verify installer exists and is active
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
    });

    if (!installer) {
      throw new InstallerServiceError('INSTALLER_NOT_FOUND', 'Installer not found');
    }

    if (!installer.isActive) {
      throw new InstallerServiceError(
        'INSTALLER_INACTIVE',
        'This installer is not currently accepting requests'
      );
    }

    // If kitchenId provided, verify ownership
    if (kitchenId) {
      const kitchen = await prisma.kitchen.findUnique({
        where: { id: kitchenId },
        select: { userId: true },
      });

      if (!kitchen) {
        throw new InstallerServiceError('KITCHEN_NOT_FOUND', 'Kitchen not found');
      }

      if (kitchen.userId !== userId) {
        throw new InstallerServiceError('ACCESS_DENIED', 'You do not own this kitchen');
      }
    }

    // Check for duplicate pending requests
    const existingRequest = await prisma.installationProject.findFirst({
      where: {
        installerId,
        userId,
        kitchenId: kitchenId || undefined,
        status: { in: ['pending', 'accepted'] },
      },
    });

    if (existingRequest) {
      throw new InstallerServiceError(
        'DUPLICATE_REQUEST',
        'You already have an active request with this installer'
      );
    }

    const installationProject = await prisma.installationProject.create({
      data: {
        installerId,
        userId,
        kitchenId: kitchenId || null,
        projectId: projectId || null,
        notes: notes || null,
        status: 'pending',
        milestones: [],
      },
    });

    logger.info('[INSTALLER] Installation requested', {
      installationProjectId: installationProject.id,
      installerId,
      userId,
    });

    return installationProject;
  }

  /**
   * Update an installation project status or details.
   * Only the installer owner or the project requester can update.
   */
  async updateProject(projectId: string, userId: string, data: UpdateProjectDto): Promise<any> {
    const project = await prisma.installationProject.findUnique({
      where: { id: projectId },
      include: {
        installer: { select: { userId: true } },
      },
    });

    if (!project) {
      throw new InstallerServiceError('PROJECT_NOT_FOUND', 'Installation project not found');
    }

    // Only installer owner or project requester can update
    const isInstaller = project.installer.userId === userId;
    const isRequester = project.userId === userId;

    if (!isInstaller && !isRequester) {
      throw new InstallerServiceError(
        'ACCESS_DENIED',
        'You do not have permission to update this project'
      );
    }

    // Status transitions: only installer can accept/progress/complete
    if (data.status && !isInstaller) {
      // Requester can only cancel
      if (data.status !== 'cancelled') {
        throw new InstallerServiceError(
          'ACCESS_DENIED',
          'Only the installer can change project status'
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.estimatedCost !== undefined) {
      updateData.estimatedCost = data.estimatedCost;
    }
    if (data.finalCost !== undefined) {
      updateData.finalCost = data.finalCost;
    }
    if (data.startDate !== undefined) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate !== undefined) {
      updateData.endDate = new Date(data.endDate);
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.dxfFileUrl !== undefined) {
      updateData.dxfFileUrl = data.dxfFileUrl;
    }
    if (data.bomFileUrl !== undefined) {
      updateData.bomFileUrl = data.bomFileUrl;
    }

    const updated = await prisma.installationProject.update({
      where: { id: projectId },
      data: updateData as any,
    });

    logger.info('[INSTALLER] Project updated', {
      installationProjectId: projectId,
      userId,
      changes: Object.keys(updateData),
    });

    return updated;
  }

  /**
   * Add a milestone to an installation project.
   * Only the installer owner can add milestones.
   */
  async addMilestone(projectId: string, userId: string, milestone: AddMilestoneDto): Promise<any> {
    const project = await prisma.installationProject.findUnique({
      where: { id: projectId },
      include: {
        installer: { select: { userId: true } },
      },
    });

    if (!project) {
      throw new InstallerServiceError('PROJECT_NOT_FOUND', 'Installation project not found');
    }

    // Only installer owner can add milestones
    if (project.installer.userId !== userId) {
      throw new InstallerServiceError('ACCESS_DENIED', 'Only the installer can add milestones');
    }

    const currentMilestones = (project.milestones as any[]) || [];

    const newMilestone = {
      name: milestone.name,
      description: milestone.description || null,
      date: milestone.date || new Date().toISOString(),
      photos: milestone.photos || [],
      status: 'completed',
    };

    const updated = await prisma.installationProject.update({
      where: { id: projectId },
      data: {
        milestones: [...currentMilestones, newMilestone],
      },
    });

    logger.info('[INSTALLER] Milestone added', {
      installationProjectId: projectId,
      milestoneName: milestone.name,
    });

    return updated;
  }

  /**
   * Get all installation projects for the current user (as requester or installer).
   */
  async getMyProjects(userId: string): Promise<any[]> {
    // Find the installer profile for this user (if they are an installer)
    const installerProfile = await prisma.installer.findFirst({
      where: { userId },
      select: { id: true },
    });

    const where: any = {
      OR: [
        { userId }, // projects requested by this user
      ],
    };

    // If user is also an installer, include their installer projects
    if (installerProfile) {
      where.OR.push({ installerId: installerProfile.id });
    }

    const projects = await prisma.installationProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        installer: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return projects;
  }

  /**
   * Get a single installation project by ID with access check.
   */
  async getProjectById(projectId: string, userId: string): Promise<any> {
    const project = await prisma.installationProject.findUnique({
      where: { id: projectId },
      include: {
        installer: {
          select: {
            id: true,
            userId: true,
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
            specialties: true,
            certifications: true,
          },
        },
      },
    });

    if (!project) {
      return null;
    }

    // Access check: requester or installer owner
    const isRequester = project.userId === userId;
    const isInstaller = project.installer.userId === userId;

    if (!isRequester && !isInstaller) {
      throw new InstallerServiceError(
        'ACCESS_DENIED',
        'You do not have permission to view this project'
      );
    }

    return project;
  }

  /**
   * Calculate the distance in kilometers between two geographic points
   * using the Haversine formula.
   */
  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) *
        Math.cos(this.degToRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// ─── Error Class ─────────────────────────────────────────────────────────────

export class InstallerServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'InstallerServiceError';
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const installerService = new InstallerService();
export default installerService;
