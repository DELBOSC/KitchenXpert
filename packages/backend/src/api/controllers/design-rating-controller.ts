import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

/**
 * Design Rating Controller
 *
 * Manages CRUD operations for design ratings.
 * Users can rate kitchen designs on a 1-5 scale with optional comments.
 */
export class DesignRatingController {
  /**
   * POST /design-ratings
   * Create or update a rating for a kitchen design (upsert by userId + kitchenId).
   */
  createOrUpdate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId, rating, comment } = req.body;

    if (!kitchenId || typeof rating !== 'number') {
      res.status(400).json({ success: false, error: 'kitchenId and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5' });
      return;
    }

    // Verify kitchen exists
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });
    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    // Upsert: create or update the rating
    const designRating = await prisma.designRating.upsert({
      where: {
        userId_kitchenId: {
          userId,
          kitchenId,
        },
      },
      update: {
        rating,
        comment: comment || null,
      },
      create: {
        userId,
        kitchenId,
        rating,
        comment: comment || null,
      },
    });

    logger.info('[DesignRating] Rating saved', { userId, kitchenId, rating });

    res.status(200).json({
      success: true,
      data: designRating,
    });
  });

  /**
   * GET /design-ratings/:kitchenId
   * Get all ratings for a kitchen design.
   */
  getByKitchen = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.params;

    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    const ratings = await prisma.designRating.findMany({
      where: { kitchenId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average
    const avg = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        ratings,
        average: Math.round(avg * 10) / 10,
        count: ratings.length,
      },
    });
  });

  /**
   * GET /design-ratings/:kitchenId/my
   * Get the current user's rating for a kitchen design.
   */
  getMyRating = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.params;

    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    const rating = await prisma.designRating.findUnique({
      where: {
        userId_kitchenId: {
          userId,
          kitchenId,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: rating,
    });
  });

  /**
   * DELETE /design-ratings/:kitchenId
   * Delete the current user's own rating for a kitchen design.
   * Only the owner of the rating can delete it.
   */
  deleteMyRating = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { kitchenId } = req.params;

    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'kitchenId is required' });
      return;
    }

    // Find the rating, verify ownership
    const existing = await prisma.designRating.findUnique({
      where: {
        userId_kitchenId: {
          userId,
          kitchenId,
        },
      },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Rating not found' });
      return;
    }

    // Only the owner can delete their own rating
    if (existing.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    await prisma.designRating.delete({
      where: { id: existing.id },
    });

    logger.info('[DesignRating] Rating deleted', { userId, kitchenId });

    res.status(200).json({
      success: true,
      message: 'Rating deleted successfully',
    });
  });
}

export const designRatingController = new DesignRatingController();
export default designRatingController;
