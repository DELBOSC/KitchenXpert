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

// ---------------------------------------------------------------------------
// Sandbox import — promotes a localStorage-only sandbox project into a
// real, persisted Project + Kitchen + KitchenItem chain.
//
// Schema MUST stay in sync with packages/frontend/src/sandbox/store.ts.
// Limits are intentionally generous to accept any believable sandbox
// payload, but tight enough to refuse a hostile payload (e.g. 10 000
// items, 1 MB labels).
// ---------------------------------------------------------------------------

const sandboxItemSchema = z.object({
  sku: z.string().max(128).nullable(),
  label: z.string().min(1).max(200),
  providerCode: z.enum(['IKEA', 'LEROY_MERLIN', 'CASTORAMA', 'SCHMIDT', 'BOSCH']).nullable(),
  unitPrice: z.number().min(0).max(100_000),
  quantity: z.number().int().min(1).max(99),
  position: z.object({
    x: z.number().finite().min(-10_000).max(10_000),
    y: z.number().finite().min(-10_000).max(10_000),
    z: z.number().finite().min(-10_000).max(10_000),
  }),
  rotation: z.number().finite().min(-360).max(360),
  size: z.object({
    w: z.number().positive().max(1_000),
    d: z.number().positive().max(1_000),
    h: z.number().positive().max(1_000),
  }),
});

const importSandboxSchema = z.object({
  project: z.object({
    name: z.string().min(1).max(200),
    fromTemplate: z.string().max(64).nullable(),
    kitchen: z.object({
      name: z.string().min(1).max(200),
      layout: z.enum(['L_SHAPED', 'U_SHAPED', 'GALLEY', 'ISLAND', 'PENINSULA', 'ONE_WALL', 'OPEN_PLAN']),
      widthCm: z.number().positive().max(2_000),
      depthCm: z.number().positive().max(2_000),
      heightCm: z.number().positive().max(500),
      // Cap at 200 items — even cluttered designs stay below 50.
      items: z.array(sandboxItemSchema).max(200),
    }),
  }),
});

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
 * /api/v1/projects/import-sandbox:
 *   post:
 *     summary: Import a sandbox project (from un-authenticated localStorage) into the user's account.
 *     description: |
 *       Creates a Project + Kitchen + KitchenItems atomically from a
 *       sandbox payload. The frontend posts this once after signup or
 *       login when it detects a `kx-sandbox-project-v1` entry in
 *       localStorage. Returns the new `projectId` + `kitchenId` so the
 *       SPA can redirect to the freshly-imported project.
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Project imported successfully
 *       400:
 *         description: Validation error (malformed sandbox payload)
 *       401:
 *         description: Unauthorized (no auth cookie)
 *       413:
 *         description: Payload too large (more than 200 items)
 */
router.post(
  '/import-sandbox',
  validateBody(importSandboxSchema),
  projectController.importSandbox,
);

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
