/**
 * Room Scan Routes
 * Photo analysis for room dimension extraction
 */

import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { uploadMultipleImages, handleUploadError } from '../../middleware/upload-middleware';
import { roomScanController } from '../controllers/room-scan-controller';
import { authenticate } from '../middleware/auth-middleware';

const router: RouterType = Router();

// Rate limiter for expensive Claude Vision API calls
const roomScanRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 scans per hour per user
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Trop de scans. Reessayez dans une heure.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Zod schema for optional context body field
export const roomScanContextSchema = z
  .object({
    context: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) {
          return undefined;
        }
        try {
          return JSON.parse(val);
        } catch {
          return undefined;
        }
      }),
  })
  .passthrough();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/room-scan/analyze:
 *   post:
 *     summary: Analyze room dimensions from uploaded photos
 *     description: Upload 1-3 photos and analyze room dimensions via Claude Vision API
 *     tags: [Room Scan]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photos
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 3
 *                 description: 1 to 3 room photos for dimension analysis
 *               context:
 *                 type: string
 *                 description: Optional JSON string with additional context
 *     responses:
 *       200:
 *         description: Room analysis results with extracted dimensions
 *       400:
 *         description: Invalid upload (no photos or wrong format)
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded (max 10 scans per hour)
 */
router.post(
  '/analyze',
  roomScanRateLimiter,
  uploadMultipleImages('photos', 3),
  handleUploadError as any,
  roomScanController.analyzeRoom
);

/**
 * @swagger
 * /api/v1/room-scan/photo-scan:
 *   post:
 *     summary: Photo-based room scan with AI dimension extraction (F3)
 *     description: Upload 1-3 photos for AI-powered room scanning. Extracts walls, openings, technical points, obstacles, and estimated dimensions using Claude Vision.
 *     tags: [Room Scan]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photos
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 3
 *                 description: 1 to 3 room photos (max 10MB each, JPEG/PNG/WebP)
 *     responses:
 *       200:
 *         description: Structured room scan result with dimensions, walls, openings, technical points, and obstacles
 *       400:
 *         description: Invalid upload (no photos, wrong format, or too many files)
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded (max 10 scans per hour)
 */
router.post(
  '/photo-scan',
  roomScanRateLimiter,
  uploadMultipleImages('photos', 3),
  handleUploadError as any,
  roomScanController.photoScan
);

export default router;
