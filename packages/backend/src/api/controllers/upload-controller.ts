/**
 * Upload Controller
 * Handles file upload, download, and management endpoints
 */

import { type Request, type Response } from 'express';

import {
  getS3StorageService,
  StorageServiceError,
  ALLOWED_FILE_TYPES,
  FILE_EXTENSIONS,
} from '../../services/storage-service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

const storageService = getS3StorageService();

/** Allowed upload folder names — prevents path traversal via user-supplied folder param */
const ALLOWED_FOLDERS = ['user-uploads', 'projects', 'kitchens', 'avatars', 'uploads'] as const;

/** Maximum file size in bytes (100 MB) */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Validate and sanitize folder name to prevent path traversal.
 * Returns a safe folder string or the default 'user-uploads'.
 */
function sanitizeFolder(folder: unknown): string {
  if (typeof folder !== 'string') {
    return 'user-uploads';
  }
  // Reject if it contains path traversal characters
  if (folder.includes('..') || folder.includes('/') || folder.includes('\\')) {
    return 'user-uploads';
  }
  if (!(ALLOWED_FOLDERS as readonly string[]).includes(folder)) {
    return 'user-uploads';
  }
  return folder;
}

/**
 * Upload Controller
 * Provides endpoints for file upload and management operations
 */
export class UploadController {
  /**
   * POST /uploads
   * Upload a file to S3
   */
  uploadFile = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No file provided',
        code: 'NO_FILE',
      });
      return;
    }

    // Validate file size (100 MB hard limit)
    if (file.size > MAX_FILE_SIZE) {
      res.status(413).json({
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        code: 'FILE_TOO_LARGE',
      });
      return;
    }

    // Get optional folder from request body or query, sanitized against path traversal
    const folder = sanitizeFolder(req.body.folder || req.query.folder || 'user-uploads');
    const isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    // Add user ID to metadata if authenticated
    if (req.user?.userId) {
      metadata.uploadedBy = req.user.userId;
    }

    // Generate unique key
    const key = storageService.generateUniqueKey(file.originalname, folder);

    try {
      const storedFile = await storageService.uploadFile(
        {
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
        key,
        {
          folder: undefined, // Key already includes folder
          metadata,
          isPublic,
          contentType: file.mimetype,
        }
      );

      logger.info(`[UploadController] File uploaded: ${storedFile.path}`, {
        userId: req.user?.userId,
        originalName: file.originalname,
        size: file.size,
      });

      res.status(201).json({
        success: true,
        data: {
          id: storedFile.id,
          key: storedFile.path,
          url: storedFile.url,
          originalName: storedFile.originalName,
          mimeType: storedFile.mimeType,
          size: storedFile.size,
          bucket: storedFile.bucket,
          createdAt: storedFile.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof StorageServiceError) {
        const statusCode =
          error.code === 'INVALID_FILE_TYPE' ? 400 : error.code === 'FILE_TOO_LARGE' ? 413 : 500;
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /uploads/:key(*)
   * Get a file - redirects to signed URL
   */
  getFile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const key = req.params.key || req.params[0];

    if (!key) {
      res.status(400).json({
        success: false,
        error: 'File key is required',
        code: 'INVALID_KEY',
      });
      return;
    }

    // Verify ownership: file key should start with user's folder or user must be admin
    const userPrefix = `users/${userId}/`;
    if (!key.startsWith(userPrefix) && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }

    const expiresIn = parseInt(req.query.expiresIn as string) || 3600;

    try {
      // Check if file exists first
      const exists = await storageService.fileExists(key);
      if (!exists) {
        res.status(404).json({
          success: false,
          error: `File not found: ${key}`,
          code: 'FILE_NOT_FOUND',
        });
        return;
      }

      const signedUrl = await storageService.getSignedUrl(key, expiresIn);

      // If download query param is set, redirect to signed URL
      if (req.query.download === 'true') {
        res.redirect(signedUrl);
        return;
      }

      // Otherwise return the URL
      res.status(200).json({
        success: true,
        data: {
          key,
          url: signedUrl,
          expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof StorageServiceError) {
        const statusCode = error.code === 'FILE_NOT_FOUND' ? 404 : 500;
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * DELETE /uploads/:key(*)
   * Delete a file from S3
   */
  deleteFile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const key = req.params.key || req.params[0];

    if (!key) {
      res.status(400).json({
        success: false,
        error: 'File key is required',
        code: 'INVALID_KEY',
      });
      return;
    }

    // Verify ownership: file key should start with user's folder or user must be admin
    const userPrefix = `users/${userId}/`;
    if (!key.startsWith(userPrefix) && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this file',
        code: 'FORBIDDEN',
      });
      return;
    }

    try {
      // Check if file exists first
      const exists = await storageService.fileExists(key);
      if (!exists) {
        res.status(404).json({
          success: false,
          error: `File not found: ${key}`,
          code: 'FILE_NOT_FOUND',
        });
        return;
      }

      const deleted = await storageService.deleteFile(key);

      logger.info(`[UploadController] File deleted: ${key}`, {
        userId: req.user?.userId,
      });

      res.status(200).json({
        success: true,
        data: {
          key,
          deleted,
        },
      });
    } catch (error) {
      if (error instanceof StorageServiceError) {
        const statusCode = error.code === 'FILE_NOT_FOUND' ? 404 : 500;
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /uploads
   * List files with optional prefix filter
   */
  listFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Scope prefix to current user's folder for non-admins
    const userPrefix = `users/${userId}/`;
    const requestedPrefix = (req.query.prefix as string) || '';
    const prefix = req.user?.role === 'admin' ? requestedPrefix : `${userPrefix}${requestedPrefix}`;
    const maxKeys = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const continuationToken = req.query.cursor as string | undefined;

    try {
      const result = await storageService.listFiles(prefix, maxKeys, continuationToken);

      res.status(200).json({
        success: true,
        data: {
          files: result.files.map((file) => ({
            key: file.key,
            size: file.contentLength,
            lastModified: file.lastModified,
            etag: file.etag,
          })),
          cursor: result.continuationToken,
          hasMore: result.isTruncated,
        },
      });
    } catch (error) {
      if (error instanceof StorageServiceError) {
        res.status(500).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /uploads/signed-url
   * Get a pre-signed URL for direct upload
   */
  getSignedUploadUrl = asyncHandler(async (req: Request, res: Response) => {
    const { filename, contentType, folder = 'uploads', expiresIn = 3600 } = req.body;

    // Validate folder to prevent path traversal
    if (
      typeof folder === 'string' &&
      (/\.\./.test(folder) || /^[/\\]/.test(folder) || /[^a-zA-Z0-9_\-/]/.test(folder))
    ) {
      res.status(400).json({
        success: false,
        error:
          'Invalid folder name. Only alphanumeric characters, hyphens, underscores, and slashes are allowed.',
        code: 'INVALID_REQUEST',
      });
      return;
    }

    if (!filename || /[/\\]|\.\./.test(filename) || /^\./.test(filename)) {
      res.status(400).json({
        success: false,
        error: 'Filename is required and must not contain path traversal characters',
        code: 'INVALID_REQUEST',
      });
      return;
    }

    if (!contentType) {
      res.status(400).json({
        success: false,
        error: 'Content type is required',
        code: 'INVALID_REQUEST',
      });
      return;
    }

    // Validate content type
    if (!ALLOWED_FILE_TYPES.includes(contentType)) {
      res.status(400).json({
        success: false,
        error: `File type ${contentType} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
        code: 'INVALID_FILE_TYPE',
      });
      return;
    }

    try {
      // Generate unique key
      const key = storageService.generateUniqueKey(filename, folder);

      const result = await storageService.getSignedUploadUrl(key, contentType, expiresIn);

      logger.info(`[UploadController] Signed upload URL generated for: ${key}`, {
        userId: req.user?.userId,
        contentType,
      });

      res.status(200).json({
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
          key: result.key,
          expiresIn,
          bucket: storageService.getBucket(),
          region: storageService.getRegion(),
        },
      });
    } catch (error) {
      if (error instanceof StorageServiceError) {
        const statusCode = error.code === 'INVALID_FILE_TYPE' ? 400 : 500;
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /uploads/:key/metadata
   * Get file metadata
   */
  getFileMetadata = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const key = req.params.key || req.params[0];

    if (!key) {
      res.status(400).json({
        success: false,
        error: 'File key is required',
        code: 'INVALID_KEY',
      });
      return;
    }

    // Verify ownership: file key should start with user's folder or user must be admin
    const userPrefix = `users/${userId}/`;
    if (!key.startsWith(userPrefix) && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }

    try {
      const metadata = await storageService.getFileMetadata(key);

      if (!metadata) {
        res.status(404).json({
          success: false,
          error: `File not found: ${key}`,
          code: 'FILE_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: metadata,
      });
    } catch (error) {
      if (error instanceof StorageServiceError) {
        const statusCode = error.code === 'FILE_NOT_FOUND' ? 404 : 500;
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /uploads/copy
   * Copy a file within S3
   */
  copyFile = asyncHandler(async (req: Request, res: Response) => {
    const { sourceKey, destKey } = req.body;

    if (!sourceKey || !destKey) {
      res.status(400).json({
        success: false,
        error: 'Both sourceKey and destKey are required',
        code: 'INVALID_REQUEST',
      });
      return;
    }

    // Verify ownership: user can only copy files from/to their own prefix
    const userId = req.user?.userId;
    const userPrefix = `users/${userId}/`;
    if (!sourceKey.startsWith(userPrefix) && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Not authorized to copy this file',
        code: 'FORBIDDEN',
      });
      return;
    }
    if (!destKey.startsWith(userPrefix) && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Not authorized to copy to this destination',
        code: 'FORBIDDEN',
      });
      return;
    }

    try {
      const copied = await storageService.copyFile(sourceKey, destKey);

      logger.info(`[UploadController] File copied from ${sourceKey} to ${destKey}`, {
        userId: req.user?.userId,
      });

      res.status(200).json({
        success: true,
        data: {
          sourceKey,
          destKey,
          copied,
          url: storageService.getPublicUrl(destKey),
        },
      });
    } catch (error) {
      if (error instanceof StorageServiceError) {
        const statusCode = error.code === 'FILE_NOT_FOUND' ? 404 : 500;
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /uploads/allowed-types
   * Get list of allowed file types
   */
  getAllowedTypes = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        allowedTypes: ALLOWED_FILE_TYPES,
        extensions: FILE_EXTENSIONS,
        maxSize: 10 * 1024 * 1024, // 10MB
      },
    });
  });
}

export const uploadController = new UploadController();
export default uploadController;
