/**
 * Collaboration Role Controller (F10)
 *
 * Handles HTTP requests for collaboration invitations, member management,
 * and role updates.
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware';
import { collaborationRoleService } from '../../services/collaboration/collaboration-role.service';
import { prisma } from '../../database/client';

export class CollaborationRoleController {
  /**
   * POST /collaboration-roles/invite
   * Send a collaboration invitation.
   */
  invite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { kitchenId, inviteeEmail, role } = req.body;

    try {
      const invite = await collaborationRoleService.invite({
        kitchenId,
        inviterId: userId,
        inviteeEmail,
        role,
      });

      res.status(201).json({
        success: true,
        data: invite,
        message: 'Invitation sent successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Kitchen not found') {
        res.status(404).json({ success: false, error: message });
      } else if (message.startsWith('Only the kitchen owner') || message.startsWith('Forbidden')) {
        res.status(403).json({ success: false, error: message });
      } else {
        throw error;
      }
    }
  });

  /**
   * GET /collaboration-roles/my-invites
   * List pending invitations for the authenticated user.
   */
  getMyInvites = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // We need the user's email to look up invites
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const invites = await collaborationRoleService.getMyInvites(user.email);

    res.status(200).json({
      success: true,
      data: invites,
    });
  });

  /**
   * POST /collaboration-roles/accept/:token
   * Accept an invitation.
   */
  acceptInvite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { token } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!token) {
      res.status(400).json({ success: false, error: 'Token is required' });
      return;
    }

    try {
      const invite = await collaborationRoleService.accept(token, userId);

      res.status(200).json({
        success: true,
        data: invite,
        message: 'Invitation accepted',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Invite not found') {
        res.status(404).json({ success: false, error: message });
      } else if (message.includes('expired') || message.includes('already been')) {
        res.status(400).json({ success: false, error: message });
      } else {
        throw error;
      }
    }
  });

  /**
   * POST /collaboration-roles/decline/:token
   * Decline an invitation.
   */
  declineInvite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ success: false, error: 'Token is required' });
      return;
    }

    try {
      await collaborationRoleService.decline(token);

      res.status(200).json({
        success: true,
        message: 'Invitation declined',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Invite not found') {
        res.status(404).json({ success: false, error: message });
      } else if (message.includes('already been')) {
        res.status(400).json({ success: false, error: message });
      } else {
        throw error;
      }
    }
  });

  /**
   * GET /collaboration-roles/members/:kitchenId
   * List all collaboration members for a kitchen.
   */
  getMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { kitchenId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!kitchenId) {
      res.status(400).json({ success: false, error: 'Kitchen ID is required' });
      return;
    }

    // Verify the user has access to this kitchen (owner or collaborator)
    const hasAccess = await collaborationRoleService.checkPermission(userId, kitchenId, 'canComment');
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });

    if (!kitchen) {
      res.status(404).json({ success: false, error: 'Kitchen not found' });
      return;
    }

    if (kitchen.userId !== userId && !hasAccess) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const members = await collaborationRoleService.getMembers(kitchenId);

    res.status(200).json({
      success: true,
      data: members,
    });
  });

  /**
   * PUT /collaboration-roles/:inviteId
   * Update a collaboration member's role.
   */
  updateRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { inviteId } = req.params;
    const { role } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!inviteId) {
      res.status(400).json({ success: false, error: 'Invite ID is required' });
      return;
    }

    try {
      const updated = await collaborationRoleService.updateRole(inviteId, role, userId);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Role updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
      } else if (message.startsWith('Forbidden')) {
        res.status(403).json({ success: false, error: message });
      } else {
        throw error;
      }
    }
  });

  /**
   * DELETE /collaboration-roles/:inviteId
   * Remove a collaboration member.
   */
  removeMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { inviteId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!inviteId) {
      res.status(400).json({ success: false, error: 'Invite ID is required' });
      return;
    }

    try {
      await collaborationRoleService.removeMember(inviteId, userId);

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
      } else if (message.startsWith('Forbidden')) {
        res.status(403).json({ success: false, error: message });
      } else {
        throw error;
      }
    }
  });
}

export const collaborationRoleController = new CollaborationRoleController();
export default collaborationRoleController;
