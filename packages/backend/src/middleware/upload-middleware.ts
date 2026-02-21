/**
 * Upload Middleware
 * Multer configuration for file uploads
 */

import multer, { FileFilterCallback, MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ALLOWED_FILE_TYPES, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES } from '../services/storage-service';
import logger from '../utils/logger';

// ==================== Configuration ====================

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 5;

// ==================== File Filter ====================

/**
 * File filter function to validate uploaded files
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  // Check if file type is allowed
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    const error = new Error(
      `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
    );
    error.name = 'INVALID_FILE_TYPE';
    callback(error as any, false);
  }
};

/**
 * Image-only file filter
 */
const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    const error = new Error(
      `Invalid image type: ${file.mimetype}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
    );
    error.name = 'INVALID_FILE_TYPE';
    callback(error as any, false);
  }
};

/**
 * Document-only file filter
 */
const documentFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    const error = new Error(
      `Invalid document type: ${file.mimetype}. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`
    );
    error.name = 'INVALID_FILE_TYPE';
    callback(error as any, false);
  }
};

// ==================== Multer Configurations ====================

/**
 * Memory storage - stores files in buffer
 * Suitable for small files that will be uploaded to S3
 */
const memoryStorage = multer.memoryStorage();

/**
 * Default upload configuration
 * Accepts all allowed file types
 */
export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter,
});

/**
 * Image upload configuration
 * Only accepts image files (jpg, png, webp)
 */
export const uploadImage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: imageFilter,
});

/**
 * Document upload configuration
 * Only accepts document files (pdf)
 */
export const uploadDocument = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: documentFilter,
});

// ==================== Middleware Handlers ====================

import type { RequestHandler } from 'express';

/**
 * Single file upload middleware
 * Usage: uploadSingle('file')
 */
export const uploadSingle = (fieldName: string = 'file'): RequestHandler => {
  return upload.single(fieldName);
};

/**
 * Multiple files upload middleware (same field)
 * Usage: uploadMultiple('files', 5)
 */
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = MAX_FILES): RequestHandler => {
  return upload.array(fieldName, maxCount);
};

/**
 * Multiple fields upload middleware
 * Usage: uploadFields([{ name: 'avatar', maxCount: 1 }, { name: 'gallery', maxCount: 5 }])
 */
export const uploadFields = (fields: { name: string; maxCount?: number }[]): RequestHandler => {
  return upload.fields(fields);
};

/**
 * Single image upload middleware
 */
export const uploadSingleImage = (fieldName: string = 'image'): RequestHandler => {
  return uploadImage.single(fieldName);
};

/**
 * Multiple images upload middleware
 */
export const uploadMultipleImages = (fieldName: string = 'images', maxCount: number = MAX_FILES): RequestHandler => {
  return uploadImage.array(fieldName, maxCount);
};

/**
 * Single document upload middleware
 */
export const uploadSingleDocument = (fieldName: string = 'document'): RequestHandler => {
  return uploadDocument.single(fieldName);
};

// ==================== Error Handler ====================

/**
 * Multer error handler middleware
 * Should be used after multer middleware to handle upload errors
 */
export const handleUploadError = (
  error: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof MulterError) {
    logger.warn(`[Upload] Multer error: ${error.code}`, {
      message: error.message,
      field: error.field,
    });

    let statusCode = 400;
    let errorCode = error.code;
    let message = error.message;

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        statusCode = 413;
        message = `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = `Too many files. Maximum is ${MAX_FILES} files`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field: ${error.field}`;
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in request';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      default:
        message = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
      },
    });
    return;
  }

  // Handle custom file filter errors
  if (error.name === 'INVALID_FILE_TYPE') {
    logger.warn(`[Upload] Invalid file type error`, {
      message: error.message,
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message,
      },
    });
    return;
  }

  // Pass other errors to the next error handler
  next(error);
};

// ==================== Utility Functions ====================

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };
  return extensions[mimeType] || '';
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Validate MIME type
 */
export function isValidMimeType(mimeType: string, allowedTypes: string[] = ALLOWED_FILE_TYPES): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== Export Constants ====================

export { MAX_FILE_SIZE, MAX_FILES, ALLOWED_FILE_TYPES, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES };

export default upload;
