import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { installerController } from '../controllers/installer-controller';
import { authenticate } from '../middleware/auth-middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
  commonSchemas,
} from '../middleware/validation-middleware';

const router: RouterType = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const searchQuerySchema = z.object({
  postalCode: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().int().min(1).max(500).optional(),
  specialties: z.string().max(500).optional(), // comma-separated
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const registerInstallerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  contactName: z.string().min(1, 'Contact name is required').max(200),
  email: z.string().email('Invalid email').max(255),
  phone: z.string().max(50).optional(),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(10),
  country: z.string().max(5).default('FR'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().int().min(1).max(500).optional(),
  specialties: z.array(z.string().max(50)).max(20).optional(),
  certifications: z.array(z.string().max(50)).max(20).optional(),
  yearsExperience: z.number().int().min(0).max(100).optional(),
  hourlyRate: z.number().min(0).max(10000).optional(),
  bio: z.string().max(5000).optional(),
  portfolioUrls: z.array(z.string().url().max(500)).max(20).optional(),
});

const addReviewSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
  photos: z.array(z.string().url().max(500)).max(10).optional(),
});

const requestInstallationSchema = z.object({
  installerId: z.string().uuid(),
  kitchenId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

const updateProjectSchema = z.object({
  status: z.enum(['pending', 'accepted', 'in_progress', 'completed', 'cancelled']).optional(),
  estimatedCost: z.number().min(0).optional(),
  finalCost: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
  dxfFileUrl: z.string().url().max(500).optional(),
  bomFileUrl: z.string().url().max(500).optional(),
});

const addMilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required').max(200),
  description: z.string().max(1000).optional(),
  date: z.string().datetime().optional(),
  photos: z.array(z.string().url().max(500)).max(10).optional(),
});

// ─── All routes require authentication ───────────────────────────────────────

router.use(authenticate);

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/installers/search:
 *   get:
 *     summary: Search installers by location, specialties, and rating
 *     tags: [Installers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: postalCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: specialties
 *         schema:
 *           type: string
 *         description: Comma-separated list of specialties
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of matching installers
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/search',
  validateQuery(searchQuerySchema),
  installerController.search,
);

/**
 * @swagger
 * /api/v1/installers/my-projects:
 *   get:
 *     summary: Get current user's installation projects
 *     tags: [Installers]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of installation projects
 *       401:
 *         description: Unauthorized
 */
router.get('/my-projects', installerController.getMyProjects);

/**
 * @swagger
 * /api/v1/installers/request:
 *   post:
 *     summary: Request an installation from an installer
 *     tags: [Installers]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - installerId
 *             properties:
 *               installerId:
 *                 type: string
 *                 format: uuid
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Installation request created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Installer not found
 */
router.post(
  '/request',
  validateBody(requestInstallationSchema),
  installerController.requestInstallation,
);

/**
 * @swagger
 * /api/v1/installers/projects/{id}:
 *   get:
 *     summary: Get an installation project by ID
 *     tags: [Installers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Installation project details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get(
  '/projects/:id',
  validateParams(commonSchemas.idParam),
  installerController.getProjectById,
);

/**
 * @swagger
 * /api/v1/installers/projects/{id}:
 *   put:
 *     summary: Update an installation project
 *     tags: [Installers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, in_progress, completed, cancelled]
 *               estimatedCost:
 *                 type: number
 *               finalCost:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.put(
  '/projects/:id',
  validateParams(commonSchemas.idParam),
  validateBody(updateProjectSchema),
  installerController.updateProject,
);

/**
 * @swagger
 * /api/v1/installers/projects/{id}/milestone:
 *   post:
 *     summary: Add a milestone to an installation project
 *     tags: [Installers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Milestone added
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.post(
  '/projects/:id/milestone',
  validateParams(commonSchemas.idParam),
  validateBody(addMilestoneSchema),
  installerController.addMilestone,
);

/**
 * @swagger
 * /api/v1/installers/{id}:
 *   get:
 *     summary: Get installer profile with reviews
 *     tags: [Installers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Installer profile with reviews
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Installer not found
 */
router.get(
  '/:id',
  validateParams(commonSchemas.idParam),
  installerController.getById,
);

/**
 * @swagger
 * /api/v1/installers:
 *   post:
 *     summary: Register as an installer
 *     tags: [Installers]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - contactName
 *               - email
 *               - address
 *               - city
 *               - postalCode
 *             properties:
 *               companyName:
 *                 type: string
 *               contactName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: string
 *               yearsExperience:
 *                 type: integer
 *               hourlyRate:
 *                 type: number
 *               bio:
 *                 type: string
 *               portfolioUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Installer profile created
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Already registered or email taken
 */
router.post(
  '/',
  validateBody(registerInstallerSchema),
  installerController.register,
);

/**
 * @swagger
 * /api/v1/installers/{id}/reviews:
 *   post:
 *     summary: Add a review for an installer
 *     tags: [Installers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Review added
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No completed project or self-review
 *       404:
 *         description: Installer not found
 *       409:
 *         description: Already reviewed
 */
router.post(
  '/:id/reviews',
  validateParams(commonSchemas.idParam),
  validateBody(addReviewSchema),
  installerController.addReview,
);

export default router;
