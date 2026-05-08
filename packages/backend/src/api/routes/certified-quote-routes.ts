/**
 * Certified Quote Routes
 *
 * API routes for the F13 Certified Quote feature.
 * All routes require authentication.
 */

import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { certifiedQuoteController } from '../controllers/certified-quote-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody, validateParams } from '../middleware/validation-middleware';

const router: RouterType = Router();

// ────────────────────────────── Validation Schemas ──────────────────────────────

const quoteItemSchema = z.object({
  ref: z.string().min(1, 'Reference is required').max(100),
  name: z.string().min(1, 'Name is required').max(500),
  description: z.string().max(1000).optional(),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPriceHT: z.number().min(0, 'Unit price must be non-negative'),
  tvaRate: z.number().min(0).max(100).optional(),
  totalHT: z.number().optional(),
  totalTVA: z.number().optional(),
  totalTTC: z.number().optional(),
});

const createQuoteSchema = z.object({
  kitchenId: z.string().uuid('Invalid kitchen ID'),
  projectId: z.string().uuid('Invalid project ID').optional(),
  clientName: z.string().min(1, 'Client name is required').max(200),
  clientEmail: z.string().email('Invalid email').max(255).optional(),
  clientAddress: z.string().max(500).optional(),
  items: z.array(quoteItemSchema).min(1, 'At least one item is required'),
  tvaRate: z.number().min(0).max(100).optional(),
  validityDays: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(2000).optional(),
});

const sendQuoteSchema = z.object({
  email: z.string().email('Invalid email').max(255),
});

const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// ────────────────────────────── Routes ──────────────────────────────

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/certified-quotes:
 *   post:
 *     summary: Create a new certified quote
 *     description: Creates a certified quote with line items, TVA calculation, and unique quote number. Requires at least one item.
 *     tags: [CertifiedQuotes]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kitchenId, clientName, items]
 *             properties:
 *               kitchenId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               clientName:
 *                 type: string
 *               clientEmail:
 *                 type: string
 *                 format: email
 *               clientAddress:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [ref, name, qty, unitPriceHT]
 *                   properties:
 *                     ref:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     qty:
 *                       type: integer
 *                     unitPriceHT:
 *                       type: number
 *                     tvaRate:
 *                       type: number
 *               tvaRate:
 *                 type: number
 *               validityDays:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Certified quote created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateBody(createQuoteSchema), certifiedQuoteController.create);

/**
 * @swagger
 * /api/v1/certified-quotes:
 *   get:
 *     summary: List quotes for current user
 *     description: Returns all certified quotes belonging to the authenticated user
 *     tags: [CertifiedQuotes]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of certified quotes
 *       401:
 *         description: Unauthorized
 */
router.get('/', certifiedQuoteController.list);

/**
 * @swagger
 * /api/v1/certified-quotes/next-number:
 *   get:
 *     summary: Get next available quote number
 *     description: Returns the next sequential quote number for the authenticated user
 *     tags: [CertifiedQuotes]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Next quote number
 *       401:
 *         description: Unauthorized
 */
router.get('/next-number', certifiedQuoteController.getNextNumber);

/**
 * @swagger
 * /api/v1/certified-quotes/{id}:
 *   get:
 *     summary: Get a single quote by ID
 *     description: Returns a certified quote. Ownership is verified.
 *     tags: [CertifiedQuotes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quote ID
 *     responses:
 *       200:
 *         description: Certified quote data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quote not found
 */
router.get('/:id', validateParams(idParamSchema), certifiedQuoteController.getById);

/**
 * @swagger
 * /api/v1/certified-quotes/{id}/sign:
 *   post:
 *     summary: Sign quote with eIDAS digital signature
 *     description: Applies an eIDAS-compatible digital signature to the quote, making it legally binding
 *     tags: [CertifiedQuotes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quote ID
 *     responses:
 *       200:
 *         description: Quote signed successfully
 *       400:
 *         description: Quote already signed or invalid state
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quote not found
 */
router.post('/:id/sign', validateParams(idParamSchema), certifiedQuoteController.sign);

/**
 * @swagger
 * /api/v1/certified-quotes/{id}/send:
 *   post:
 *     summary: Send quote by email
 *     description: Sends the certified quote as a PDF attachment to the specified email address
 *     tags: [CertifiedQuotes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quote ID
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
 *     responses:
 *       200:
 *         description: Quote sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quote not found
 */
router.post(
  '/:id/send',
  validateParams(idParamSchema),
  validateBody(sendQuoteSchema),
  certifiedQuoteController.send
);

/**
 * @swagger
 * /api/v1/certified-quotes/{id}/pdf:
 *   get:
 *     summary: Download quote as PDF
 *     description: Generates and downloads the certified quote as a PDF document
 *     tags: [CertifiedQuotes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quote ID
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quote not found
 */
router.get('/:id/pdf', validateParams(idParamSchema), certifiedQuoteController.downloadPDF);

export default router;
