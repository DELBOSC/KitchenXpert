/**
 * Collaboration Role Service (F10)
 *
 * Manages role-based collaboration invitations for kitchen designs.
 * Each role (viewer, designer, installer, supplier) maps to a specific
 * permission set controlling what the collaborator can do within the kitchen.
 *
 * Token generation uses crypto.randomBytes (not Math.random).
 */

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/client';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('collaboration-role');

// ─── Types ──────────────────────────────────────────────────────────────────

export type CollaborationRole = 'viewer' | 'designer' | 'installer' | 'supplier';

export interface CollaborationPermissions {
  canEdit: boolean;
  canComment: boolean;
  canExport: boolean;
  canViewSpecs: boolean;
  canViewBOM: boolean;
}

export interface CollaborationMember {
  id: string;
  kitchenId: string;
  inviterId: string;
  inviteeEmail: string;
  role: string;
  permissions: CollaborationPermissions;
  status: string;
  createdAt: Date;
}

// ─── Role → Permission Mapping ──────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<CollaborationRole, CollaborationPermissions> = {
  viewer: {
    canEdit: false,
    canComment: true,
    canExport: false,
    canViewSpecs: false,
    canViewBOM: false,
  },
  designer: {
    canEdit: true,
    canComment: true,
    canExport: true,
    canViewSpecs: true,
    canViewBOM: true,
  },
  installer: {
    canEdit: false,
    canComment: true,
    canExport: true,
    canViewSpecs: true,
    canViewBOM: true,
  },
  supplier: {
    canEdit: false,
    canComment: false,
    canExport: false,
    canViewSpecs: false,
    canViewBOM: true,
  },
};

// ─── Service ────────────────────────────────────────────────────────────────

export class CollaborationRoleService {
  /**
   * Invite someone to collaborate on a kitchen with a specific role.
   * Generates a unique token using crypto.randomBytes.
   */
  async invite(data: {
    kitchenId: string;
    inviterId: string;
    inviteeEmail: string;
    role: CollaborationRole;
  }) {
    const { kitchenId, inviterId, inviteeEmail, role } = data;

    // Verify kitchen exists and the inviter owns it (or is admin)
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    if (kitchen.userId !== inviterId) {
      // Only the kitchen owner can send invitations.
      // A production system would also allow admin role override.
      throw new Error('Only the kitchen owner can send invitations');
    }

    // Generate a secure, unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Get permissions based on role
    const permissions = ROLE_PERMISSIONS[role];

    const invite = await prisma.collaborationInvite.create({
      data: {
        kitchenId,
        inviterId,
        inviteeEmail: inviteeEmail.toLowerCase().trim(),
        role,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        token,
        status: 'pending',
        expiresAt,
      },
    });

    logger.info(`Collaboration invite sent: kitchen=${kitchenId}, invitee=${inviteeEmail}, role=${role}`);

    // TODO: Send email notification using existing email service
    // e.g. emailService.sendCollaborationInvite({ to: inviteeEmail, token, role, kitchenName: kitchen.name });

    return invite;
  }

  /**
   * Accept an invitation by token.
   * Marks the invite as accepted if it is still pending and not expired.
   */
  async accept(token: string, userId: string) {
    const invite = await prisma.collaborationInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new Error(`Invite has already been ${invite.status}`);
    }

    if (invite.expiresAt < new Date()) {
      // Mark as expired
      await prisma.collaborationInvite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });
      throw new Error('Invite has expired');
    }

    const updated = await prisma.collaborationInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted' },
    });

    logger.info(`Invite accepted: id=${invite.id}, userId=${userId}, kitchen=${invite.kitchenId}`);
    return updated;
  }

  /**
   * Decline an invitation by token.
   */
  async decline(token: string): Promise<void> {
    const invite = await prisma.collaborationInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new Error(`Invite has already been ${invite.status}`);
    }

    await prisma.collaborationInvite.update({
      where: { id: invite.id },
      data: { status: 'declined' },
    });

    logger.info(`Invite declined: id=${invite.id}, kitchen=${invite.kitchenId}`);
  }

  /**
   * Get all collaboration members for a kitchen (accepted invites).
   */
  async getMembers(kitchenId: string): Promise<CollaborationMember[]> {
    const invites = await prisma.collaborationInvite.findMany({
      where: { kitchenId },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((invite) => ({
      id: invite.id,
      kitchenId: invite.kitchenId,
      inviterId: invite.inviterId,
      inviteeEmail: invite.inviteeEmail,
      role: invite.role,
      permissions: invite.permissions as unknown as CollaborationPermissions,
      status: invite.status,
      createdAt: invite.createdAt,
    }));
  }

  /**
   * Update a member's role (and recalculate permissions).
   * Only the kitchen owner (requesterId must match kitchen.userId) can do this.
   */
  async updateRole(inviteId: string, newRole: CollaborationRole, requesterId: string) {
    const invite = await prisma.collaborationInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new Error('Collaboration invite not found');
    }

    // Verify the requester owns the kitchen
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: invite.kitchenId },
    });

    if (!kitchen || kitchen.userId !== requesterId) {
      throw new Error('Forbidden: only the kitchen owner can update roles');
    }

    const permissions = ROLE_PERMISSIONS[newRole];

    const updated = await prisma.collaborationInvite.update({
      where: { id: inviteId },
      data: {
        role: newRole,
        permissions: permissions as unknown as Prisma.InputJsonValue,
      },
    });

    logger.info(`Role updated: invite=${inviteId}, newRole=${newRole}, by=${requesterId}`);
    return updated;
  }

  /**
   * Remove a collaborator (delete the invite record).
   * Only the kitchen owner can do this.
   */
  async removeMember(inviteId: string, requesterId: string): Promise<void> {
    const invite = await prisma.collaborationInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new Error('Collaboration invite not found');
    }

    // Verify the requester owns the kitchen
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: invite.kitchenId },
    });

    if (!kitchen || kitchen.userId !== requesterId) {
      throw new Error('Forbidden: only the kitchen owner can remove members');
    }

    await prisma.collaborationInvite.delete({
      where: { id: inviteId },
    });

    logger.info(`Member removed: invite=${inviteId}, by=${requesterId}`);
  }

  /**
   * Check if a user has a specific permission on a kitchen.
   * The kitchen owner always has all permissions.
   */
  async checkPermission(userId: string, kitchenId: string, permission: string): Promise<boolean> {
    // Check if user is the kitchen owner
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) return false;
    if (kitchen.userId === userId) return true; // Owner has all permissions

    // Look up the user's email to match against invite
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) return false;

    // Find the user's accepted invite for this kitchen
    const invite = await prisma.collaborationInvite.findFirst({
      where: {
        kitchenId,
        inviteeEmail: user.email.toLowerCase(),
        status: 'accepted',
      },
    });

    if (!invite) return false;

    const permissions = invite.permissions as unknown as CollaborationPermissions;
    return (permissions as unknown as Record<string, boolean>)[permission] ?? false;
  }

  /**
   * Get pending invitations for a user (by email).
   */
  async getMyInvites(email: string) {
    return prisma.collaborationInvite.findMany({
      where: {
        inviteeEmail: email.toLowerCase().trim(),
        status: 'pending',
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const collaborationRoleService = new CollaborationRoleService();
export default collaborationRoleService;
