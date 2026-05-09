import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { projectController } from '../controllers/project-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody, validateParams, commonSchemas } from '../middleware/validation-middleware';

const router: RouterType = Router();

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'in_progress', 'review', 'approved', 'completed', 'archived']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(['draft', 'in_progress', 'review', 'approved', 'completed', 'archived']),
});

const addCollaboratorSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(['viewer', 'editor', 'admin']).optional(),
});

// All routes require authentication
router.use(authenticate);

// Project CRUD

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     summary: List all projects for current user
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *       401:
 *         description: Unauthorized
 */
router.get('/', projectController.getAll);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/:id', validateParams(commonSchemas.idParam), projectController.getById);

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, in_progress, review, approved, completed, archived]
 *     responses:
 *       201:
 *         description: Project created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateBody(createProjectSchema), projectController.create);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, in_progress, review, approved, completed, archived]
 *     responses:
 *       200:
 *         description: Project updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.put('/:id', validateParams(commonSchemas.idParam), validateBody(updateProjectSchema), projectController.update);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.delete('/:id', validateParams(commonSchemas.idParam), projectController.delete);

// Project status

/**
 * @swagger
 * /api/v1/projects/{id}/status:
 *   put:
 *     summary: Update project status
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, in_progress, review, approved, completed, archived]
 *     responses:
 *       200:
 *         description: Status updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.put('/:id/status', validateParams(commonSchemas.idParam), validateBody(updateStatusSchema), projectController.updateStatus);

// Collaborators

/**
 * @swagger
 * /api/v1/projects/{id}/collaborators:
 *   get:
 *     summary: Get project collaborators
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of collaborators
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/:id/collaborators', validateParams(commonSchemas.idParam), projectController.getCollaborators);

/**
 * @swagger
 * /api/v1/projects/{id}/collaborators:
 *   post:
 *     summary: Add a collaborator to project
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [viewer, editor, admin]
 *     responses:
 *       201:
 *         description: Collaborator added
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.post('/:id/collaborators', validateParams(commonSchemas.idParam), validateBody(addCollaboratorSchema), projectController.addCollaborator);

/**
 * @swagger
 * /api/v1/projects/{id}/collaborators/{email}:
 *   delete:
 *     summary: Remove a collaborator from project
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collaborator removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project or collaborator not found
 */
router.delete('/:id/collaborators/:email', validateParams(z.object({
  id: z.string().uuid(),
  email: z.string().email('Invalid email format'),
})), projectController.removeCollaborator);

// Project kitchens

/**
 * @swagger
 * /api/v1/projects/{id}/kitchens:
 *   get:
 *     summary: Get kitchens in a project
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of kitchens
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/:id/kitchens', validateParams(commonSchemas.idParam), projectController.getKitchens);

// Duplication

/**
 * @swagger
 * /api/v1/projects/{id}/duplicate:
 *   post:
 *     summary: Duplicate a project
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Project duplicated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.post('/:id/duplicate', validateParams(commonSchemas.idParam), projectController.duplicate);

// Statistics

/**
 * @swagger
 * /api/v1/projects/{id}/stats:
 *   get:
 *     summary: Get project statistics
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project statistics
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/:id/stats', validateParams(commonSchemas.idParam), projectController.getStats);

export default router;
