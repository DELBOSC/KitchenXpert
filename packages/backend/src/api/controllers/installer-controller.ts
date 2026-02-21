import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware';
import {
  installerService,
  InstallerServiceError,
} from '../../services/installer/installer.service';
import _logger from '../../utils/logger';

/**
 * Installer Marketplace Controller
 * Handles HTTP requests for installer search, profiles, reviews, and installation projects.
 */
export class InstallerController {
  /**
   * GET /installers/search
   * Search installers by location, specialties, and rating.
   */
  search = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const {
      postalCode,
      city,
      latitude,
      longitude,
      radiusKm,
      specialties,
      minRating,
      page,
      limit,
    } = req.query;

    const result = await installerService.search({
      postalCode: postalCode as string | undefined,
      city: city as string | undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      specialties: specialties
        ? (specialties as string).split(',').map((s) => s.trim())
        : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    res.status(200).json({
      success: true,
      data: result.installers,
      meta: {
        total: result.total,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      },
    });
  });

  /**
   * GET /installers/my-projects
   * Get current user's installation projects (as requester or installer).
   */
  getMyProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const projects = await installerService.getMyProjects(userId);

    res.status(200).json({
      success: true,
      data: projects,
    });
  });

  /**
   * GET /installers/:id
   * Get installer profile with reviews.
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;
    const installer = await installerService.getById(id!);

    if (!installer) {
      res.status(404).json({ success: false, error: 'Installer not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: installer,
    });
  });

  /**
   * POST /installers
   * Register as an installer.
   */
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    try {
      const installer = await installerService.register(userId, req.body);

      res.status(201).json({
        success: true,
        data: installer,
        message: 'Installer profile created successfully',
      });
    } catch (error) {
      if (error instanceof InstallerServiceError) {
        const statusMap: Record<string, number> = {
          ALREADY_REGISTERED: 409,
          EMAIL_TAKEN: 409,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json({ success: false, error: error.message, code: error.code });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /installers/:id/reviews
   * Add a review to an installer.
   */
  addReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    try {
      const review = await installerService.addReview(id!, userId, req.body);

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review added successfully',
      });
    } catch (error) {
      if (error instanceof InstallerServiceError) {
        const statusMap: Record<string, number> = {
          INSTALLER_NOT_FOUND: 404,
          SELF_REVIEW: 403,
          ALREADY_REVIEWED: 409,
          NO_COMPLETED_PROJECT: 403,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json({ success: false, error: error.message, code: error.code });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /installers/request
   * Request an installation from an installer.
   */
  requestInstallation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { installerId, kitchenId, projectId, notes } = req.body;

    try {
      const project = await installerService.requestInstallation({
        installerId,
        userId,
        kitchenId,
        projectId,
        notes,
      });

      res.status(201).json({
        success: true,
        data: project,
        message: 'Installation request sent successfully',
      });
    } catch (error) {
      if (error instanceof InstallerServiceError) {
        const statusMap: Record<string, number> = {
          INSTALLER_NOT_FOUND: 404,
          INSTALLER_INACTIVE: 400,
          KITCHEN_NOT_FOUND: 404,
          ACCESS_DENIED: 403,
          DUPLICATE_REQUEST: 409,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json({ success: false, error: error.message, code: error.code });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /installers/projects/:id
   * Get a single installation project by ID.
   */
  getProjectById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    try {
      const project = await installerService.getProjectById(id!, userId);

      if (!project) {
        res.status(404).json({ success: false, error: 'Installation project not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      if (error instanceof InstallerServiceError) {
        const statusMap: Record<string, number> = {
          ACCESS_DENIED: 403,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json({ success: false, error: error.message, code: error.code });
        return;
      }
      throw error;
    }
  });

  /**
   * PUT /installers/projects/:id
   * Update an installation project.
   */
  updateProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    try {
      const updated = await installerService.updateProject(id!, userId, req.body);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Installation project updated successfully',
      });
    } catch (error) {
      if (error instanceof InstallerServiceError) {
        const statusMap: Record<string, number> = {
          PROJECT_NOT_FOUND: 404,
          ACCESS_DENIED: 403,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json({ success: false, error: error.message, code: error.code });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /installers/projects/:id/milestone
   * Add a milestone to an installation project.
   */
  addMilestone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    try {
      const updated = await installerService.addMilestone(id!, userId, req.body);

      res.status(201).json({
        success: true,
        data: updated,
        message: 'Milestone added successfully',
      });
    } catch (error) {
      if (error instanceof InstallerServiceError) {
        const statusMap: Record<string, number> = {
          PROJECT_NOT_FOUND: 404,
          ACCESS_DENIED: 403,
        };
        const status = statusMap[error.code] || 400;
        res.status(status).json({ success: false, error: error.message, code: error.code });
        return;
      }
      throw error;
    }
  });
}

export const installerController = new InstallerController();
export default installerController;
