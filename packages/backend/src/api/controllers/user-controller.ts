import { Request, Response } from 'express';
import { PrismaUserRepository } from '../../repositories/prisma-user.repository';
import { asyncHandler } from '../middleware/error-middleware';
import { prisma } from '../../database/client';

const userRepository = new PrismaUserRepository(prisma);

/**
 * User Controller
 * Handles all user-related HTTP requests
 */
export class UserController {
  /**
   * GET /users/me
   * Get current user profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const user = await userRepository.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { password: _pw, ...safeUser } = user as any;
    res.status(200).json({ success: true, data: safeUser });
  });

  /**
   * PUT /users/me
   * Update current user profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const { firstName, lastName, phone, avatar, language, timezone } = req.body;

    const user = await userRepository.updateProfile(userId, {
      firstName,
      lastName,
      phone,
      avatar,
      language,
      timezone,
    });

    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  });

  /**
   * GET /users/:id (Admin only)
   * Get a user by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const user = await userRepository.findById(id);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { password: _pw, ...safeUser } = user as any;
    res.status(200).json({ success: true, data: safeUser });
  });

  /**
   * GET /users (Admin only)
   * Get all users
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status, role } = req.query;

    const result = await userRepository.findPaginated({
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      role: role as string,
    });

    res.status(200).json({
      success: true,
      data: result.users,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    });
  });

  /**
   * PUT /users/:id (Admin only)
   * Update a user
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { firstName, lastName, phone, avatar, language, timezone } = req.body;

    const user = await userRepository.updateProfile(id, {
      firstName,
      lastName,
      phone,
      avatar,
      language,
      timezone,
    });

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  });

  /**
   * DELETE /users/:id (Admin only)
   * Delete a user (soft delete)
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await userRepository.softDelete(id);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  });

  /**
   * PUT /users/:id/status (Admin only)
   * Update user status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { status } = req.body;

    await userRepository.updateStatus(id, status);
    const user = await userRepository.findById(id);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User status updated successfully',
    });
  });

  /**
   * GET /users/me/preferences
   * Get user preferences (returns basic user settings)
   */
  getPreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const user = await userRepository.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        language: user.language,
        timezone: user.timezone,
      },
    });
  });

  /**
   * PUT /users/me/preferences
   * Update user preferences
   */
  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const { language, timezone } = req.body;

    const user = await userRepository.updateProfile(userId, {
      language,
      timezone,
    });

    res.status(200).json({
      success: true,
      data: {
        language: user.language,
        timezone: user.timezone,
      },
      message: 'Preferences updated successfully',
    });
  });

  /**
   * GET /users/stats (Admin only)
   * Get user statistics
   */
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const total = await userRepository.count();

    res.status(200).json({
      success: true,
      data: {
        total,
      },
    });
  });
}

export const userController = new UserController();
export default userController;
