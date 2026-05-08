/**
 * Collaboration Role Routes (F10)
 *
 * All routes are protected (require authentication).
 *
 * Routes:
 *   POST   /collaboration-roles/invite           — Send invite
 *   GET    /collaboration-roles/my-invites        — My pending invites
 *   POST   /collaboration-roles/accept/:token     — Accept invite
 *   POST   /collaboration-roles/decline/:token    — Decline invite
 *   GET    /collaboration-roles/members/:kitchenId — List members
 *   PUT    /collaboration-roles/:inviteId         — Update role
 *   DELETE /collaboration-roles/:inviteId         — Remove member
 */

import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { collaborationRoleController } from '../controllers/collaboration-role-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ─── Validation schemas ──────────────────────────────────────────────────────

const inviteSchema = z.object({
  kitchenId: z.string().min(1, 'Kitchen ID is required'),
  inviteeEmail: z.string().email('Valid email is required').toLowerCase().trim(),
  role: z.enum(['viewer', 'designer', 'installer', 'supplier']),
});

const updateRoleSchema = z.object({
  role: z.enum(['viewer', 'designer', 'installer', 'supplier']),
});

// ─── Protected routes ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/collaboration-roles/invite:
 *   post:
 *     summary: Send a collaboration invite
 *     tags: [Collaboration]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kitchenId, inviteeEmail, role]
 *             properties:
 *               kitchenId:
 *                 type: string
 *               inviteeEmail:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [viewer, designer, installer, supplier]
 *     responses:
 *       201:
 *         description: Invite sent
 *       403:
 *         description: Only kitchen owner can invite
 *       404:
 *         description: Kitchen not found
 */
router.post('/invite', authenticate, validateBody(inviteSchema), collaborationRoleController.invite);

/**
 * @swagger
 * /api/v1/collaboration-roles/my-invites:
 *   get:
 *     summary: Get my pending invitations
 *     tags: [Collaboration]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of pending invites
 */
router.get('/my-invites', authenticate, collaborationRoleController.getMyInvites);

/**
 * @swagger
 * /api/v1/collaboration-roles/accept/{token}:
 *   post:
 *     summary: Accept a collaboration invite
 *     tags: [Collaboration]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite accepted
 *       400:
 *         description: Invalid or expired invite
 *       404:
 *         description: Invite not found
 */
router.post('/accept/:token', authenticate, collaborationRoleController.acceptInvite);

/**
 * @swagger
 * /api/v1/collaboration-roles/decline/{token}:
 *   post:
 *     summary: Decline a collaboration invite
 *     tags: [Collaboration]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite declined
 *       400:
 *         description: Invalid invite
 *       404:
 *         description: Invite not found
 */
router.post('/decline/:token', authenticate, collaborationRoleController.declineInvite);

/**
 * @swagger
 * /api/v1/collaboration-roles/members/{kitchenId}:
 *   get:
 *     summary: List collaboration members for a kitchen
 *     tags: [Collaboration]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of members
 *       403:
 *         description: Access denied
 *       404:
 *         description: Kitchen not found
 */
router.get('/members/:kitchenId', authenticate, collaborationRoleController.getMembers);

/**
 * @swagger
 * /api/v1/collaboration-roles/{inviteId}:
 *   put:
 *     summary: Update a member's role
 *     tags: [Collaboration]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [viewer, designer, installer, supplier]
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Invite not found
 */
router.put('/:inviteId', authenticate, validateBody(updateRoleSchema), collaborationRoleController.updateRole);

/**
 * @swagger
 * /api/v1/collaboration-roles/{inviteId}:
 *   delete:
 *     summary: Remove a collaboration member
 *     tags: [Collaboration]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Invite not found
 */
router.delete('/:inviteId', authenticate, collaborationRoleController.removeMember);

export default router;
