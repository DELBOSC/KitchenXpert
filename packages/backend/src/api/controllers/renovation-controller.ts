/**
 * Renovation Controller (F7)
 *
 * Handles HTTP requests for renovation project management:
 * - Creating renovation projects
 * - Analyzing existing kitchen photos
 * - Generating before/after comparisons
 * - Listing user's renovation projects
 */

import { type Request, type Response, type NextFunction } from 'express';

import { RenovationService } from '../../services/ai/renovation.service';
import logger from '../../utils/logger';

const renovationService = new RenovationService();

class RenovationController {
  /**
   * POST /renovation
   * Create a new renovation project
   */
  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
        return;
      }

      const { kitchenId, beforePhotos } = req.body;

      const project = await renovationService.createProject(userId, {
        kitchenId,
        beforePhotos,
      });

      logger.info('[Renovation] Project created', {
        projectId: (project as any).id,
        userId,
      });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      logger.error('[Renovation] Create project failed', { error });
      next(error);
    }
  }

  /**
   * GET /renovation/:id
   * Get a renovation project by ID (ownership verified)
   */
  async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_ID', message: 'Project ID is required.' },
        });
        return;
      }

      const isAdmin = req.user?.role === 'admin';
      const project = await renovationService.getProject(id, userId, isAdmin);

      if (!project) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Renovation project not found.' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      logger.error('[Renovation] Get project failed', { error });
      next(error);
    }
  }

  /**
   * POST /renovation/analyze-photo
   * Analyze an existing kitchen photo
   * Expects multipart/form-data with a single image field "photo"
   */
  async analyzePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
        return;
      }

      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_PHOTO', message: 'A photo is required for analysis.' },
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxFileSize = 10 * 1024 * 1024;
      if (file.size > maxFileSize) {
        res.status(413).json({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'Photo must be under 10MB.' },
        });
        return;
      }

      const mediaType = file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp';
      const analysis = await renovationService.analyzeExistingKitchen(
        file.buffer,
        userId,
        mediaType,
      );

      // If a projectId is provided in the body, update the project
      const projectId = req.body?.projectId;
      if (projectId) {
        try {
          await renovationService.updateProject(projectId, {
            detectedLayout: analysis,
            estimatedDemoCost: analysis.estimatedDemolitionCostEur,
            status: 'analyzing',
          });
        } catch (updateErr) {
          logger.warn('[Renovation] Failed to update project with analysis', {
            projectId,
            error: updateErr instanceof Error ? updateErr.message : String(updateErr),
          });
        }
      }

      logger.info('[Renovation] Photo analysis completed', {
        userId,
        overallCondition: analysis.overallCondition,
        confidence: analysis.confidence,
      });

      res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      logger.error('[Renovation] Photo analysis failed', { error });
      next(error);
    }
  }

  /**
   * GET /renovation/:id/compare
   * Get before/after comparison for a renovation project
   */
  async getComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_ID', message: 'Project ID is required.' },
        });
        return;
      }

      const isAdmin = req.user?.role === 'admin';
      const project = await renovationService.getProject(id, userId, isAdmin);

      if (!project) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Renovation project not found.' },
        });
        return;
      }

      const projectData = project as Record<string, any>;

      // If comparison data already exists, return it
      if (projectData.comparisonData) {
        res.status(200).json({
          success: true,
          data: projectData.comparisonData,
        });
        return;
      }

      // Need both analysis and after design to generate comparison
      if (!projectData.detectedLayout) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_ANALYSIS',
            message: 'Existing kitchen analysis is required before comparison. Upload and analyze a photo first.',
          },
        });
        return;
      }

      if (!projectData.afterDesignId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_DESIGN',
            message: 'A new design must be linked before generating a comparison.',
          },
        });
        return;
      }

      // Generate comparison
      const comparison = await renovationService.generateComparison(
        projectData.detectedLayout,
        projectData.afterDesignId,
      );

      // Save comparison data
      await renovationService.updateProject(id, {
        comparisonData: comparison,
        estimatedRenoCost: comparison.estimatedRenovationCostEur,
        estimatedDemoCost: comparison.estimatedDemolitionCostEur,
        status: 'compared',
      });

      logger.info('[Renovation] Comparison generated', {
        projectId: id,
        userId,
        totalCost: comparison.totalCostEur,
      });

      res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error('[Renovation] Comparison failed', { error });
      next(error);
    }
  }

  /**
   * GET /renovation/my-projects
   * List all renovation projects for the current user
   */
  async listMyProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
        return;
      }

      const projects = await renovationService.listUserProjects(userId);

      res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      logger.error('[Renovation] List projects failed', { error });
      next(error);
    }
  }
}

export const renovationController = new RenovationController();
