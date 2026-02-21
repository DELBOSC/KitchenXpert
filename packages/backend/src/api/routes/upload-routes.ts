/**
 * Upload Routes
 * File upload and management endpoints
 */

import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import { uploadController } from '../controllers/upload-controller';
import { authenticate } from '../middleware/auth-middleware';
import { uploadSingle, handleUploadError } from '../../middleware/upload-middleware';

const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 uploads per window
  message: { success: false, error: 'Too many uploads, please try again later' },
});

const router: RouterType = Router();

// ==================== Public Routes ====================

/**
 * @swagger
 * /api/v1/uploads/allowed-types:
 *   get:
 *     summary: Get list of allowed file types
 *     description: Returns the list of allowed MIME types and extensions for file uploads. Public endpoint.
 *     tags: [Uploads]
 *     responses:
 *       200:
 *         description: List of allowed file types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/allowed-types', uploadController.getAllowedTypes);

// ==================== Protected Routes ====================

// All routes below require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/uploads:
 *   post:
 *     summary: Upload a single file
 *     tags: [Uploads]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file or missing file
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded (max 30 uploads per 15 minutes)
 */
router.post(
  '/',
  uploadRateLimiter,
  uploadSingle('file'),
  handleUploadError,
  uploadController.uploadFile
);

/**
 * @swagger
 * /api/v1/uploads:
 *   get:
 *     summary: List uploaded files
 *     tags: [Uploads]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: prefix
 *         schema:
 *           type: string
 *         description: Filter files by key prefix
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of files to return
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Continuation token for pagination
 *     responses:
 *       200:
 *         description: List of files
 *       401:
 *         description: Unauthorized
 */
router.get('/', uploadController.listFiles);

/**
 * @swagger
 * /api/v1/uploads/signed-url:
 *   post:
 *     summary: Get a pre-signed URL for direct S3 upload
 *     tags: [Uploads]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - contentType
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Original filename
 *               contentType:
 *                 type: string
 *                 description: MIME type of the file
 *               folder:
 *                 type: string
 *                 description: Optional folder/prefix for the upload
 *               expiresIn:
 *                 type: integer
 *                 default: 3600
 *                 description: URL expiration in seconds
 *     responses:
 *       200:
 *         description: Pre-signed upload URL
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post('/signed-url', uploadController.getSignedUploadUrl);

/**
 * @swagger
 * /api/v1/uploads/copy:
 *   post:
 *     summary: Copy a file within S3
 *     tags: [Uploads]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceKey
 *               - destKey
 *             properties:
 *               sourceKey:
 *                 type: string
 *                 description: Source file key in S3
 *               destKey:
 *                 type: string
 *                 description: Destination file key in S3
 *     responses:
 *       200:
 *         description: File copied successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Source file not found
 */
router.post('/copy', uploadController.copyFile);

/**
 * @swagger
 * /api/v1/uploads/{key}:
 *   get:
 *     summary: Get a file by key
 *     description: Returns a signed URL for the file or redirects to the file. Supports nested paths.
 *     tags: [Uploads]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: File key (supports nested paths like images/photo.jpg)
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *           default: 3600
 *         description: URL expiration in seconds
 *       - in: query
 *         name: download
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: If true, redirects to the signed URL
 *     responses:
 *       200:
 *         description: Signed URL for the file
 *       302:
 *         description: Redirect to signed URL (when download=true)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.get('/:key(*)', uploadController.getFile);

/**
 * @swagger
 * /api/v1/uploads/{key}/metadata:
 *   get:
 *     summary: Get file metadata
 *     tags: [Uploads]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: File key (supports nested paths)
 *     responses:
 *       200:
 *         description: File metadata (size, content type, last modified, etc.)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.get('/:key(*)/metadata', uploadController.getFileMetadata);

/**
 * @swagger
 * /api/v1/uploads/{key}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Uploads]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: File key (supports nested paths)
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.delete('/:key(*)', uploadController.deleteFile);

export default router;
