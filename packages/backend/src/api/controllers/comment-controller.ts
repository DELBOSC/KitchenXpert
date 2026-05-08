import { type Request, type Response } from 'express';

import { NotFoundError, BadRequestError, ForbiddenError } from '@kitchenxpert/common';

import { prisma } from '../../database/client';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * Comment Controller
 * Handles all project comment-related HTTP requests
 */
export class CommentController {
  /**
   * POST /comments
   * Create a new comment on a project
   */
  createComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { projectId, content, parentId } = req.body;

    if (!projectId || !content) {
      throw new BadRequestError('projectId and content are required');
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // If parentId is provided, verify parent comment exists
    if (parentId) {
      const parentComment = await prisma.projectComment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment || parentComment.deletedAt) {
        throw new NotFoundError('Parent comment not found');
      }

      if (parentComment.projectId !== projectId) {
        throw new BadRequestError('Parent comment does not belong to the same project');
      }
    }

    const comment = await prisma.projectComment.create({
      data: {
        projectId,
        userId: userId!,
        content,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  });

  /**
   * GET /comments?projectId=xxx
   * Get all comments for a project, including replies
   */
  getComments = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      throw new BadRequestError('projectId query parameter is required');
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Fetch top-level comments (no parent) with their replies
    const comments = await prisma.projectComment.findMany({
      where: {
        projectId,
        parentId: null,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        replies: {
          where: {
            deletedAt: null,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: comments,
    });
  });

  /**
   * PUT /comments/:id
   * Update a comment's content (ownership required)
   */
  updateComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      throw new BadRequestError('content is required');
    }

    const comment = await prisma.projectComment.findUnique({
      where: { id },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundError('Comment not found');
    }

    // Only the comment owner can edit
    if (comment.userId !== userId) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    const updatedComment = await prisma.projectComment.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updatedComment,
    });
  });

  /**
   * DELETE /comments/:id
   * Soft delete a comment (owner or admin)
   */
  deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;

    const comment = await prisma.projectComment.findUnique({
      where: { id },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundError('Comment not found');
    }

    // Owner or admin can delete
    if (comment.userId !== userId && req.user?.role !== 'admin') {
      throw new ForbiddenError('You can only delete your own comments');
    }

    await prisma.projectComment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  });
}

export const commentController = new CommentController();
export default commentController;
