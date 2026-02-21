/**
 * Storage Service
 * Handles file uploads, storage, and retrieval with S3 support
 */

import * as crypto from 'crypto';
import * as path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3ServiceException,
  type _Object,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from '../utils/logger';

// ==================== Types & Interfaces ====================

export interface StorageConfig {
  provider: StorageProvider;
  basePath: string;
  baseUrl: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  bucket?: string;
  region?: string;
}

export type StorageProvider = 'local' | 's3' | 'gcs' | 'azure';

export interface StoredFile {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  bucket?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
}

export interface UploadOptions {
  folder?: string;
  filename?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
  contentType?: string;
}

export interface FileUpload {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface S3FileMetadata {
  key: string;
  bucket: string;
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface ListFilesResult {
  files: S3FileMetadata[];
  continuationToken?: string;
  isTruncated: boolean;
}

export interface StorageAdapter {
  upload(file: FileUpload, storedName: string, options: UploadOptions): Promise<StoredFile>;
  delete(path: string): Promise<boolean>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  exists(path: string): Promise<boolean>;
  getMetadata(path: string): Promise<Partial<StoredFile> | null>;
}

// ==================== Default Configuration ====================

const defaultConfig: StorageConfig = {
  provider: 'local',
  basePath: './uploads',
  baseUrl: '/uploads',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'model/gltf-binary',
    'model/gltf+json',
  ],
};

// ==================== Allowed File Types ====================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
export const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

export const FILE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

// ==================== S3 Storage Service ====================

export class S3StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET || '';

    if (!this.bucket) {
      logger.warn('[S3Storage] AWS_S3_BUCKET not configured - S3 operations will fail');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    logger.info(`[S3Storage] Initialized with bucket: ${this.bucket}, region: ${this.region}`);
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    file: FileUpload,
    key: string,
    options: UploadOptions = {}
  ): Promise<StoredFile> {
    const { folder, metadata = {}, isPublic = false, contentType } = options;

    // Build the full key with folder prefix if provided
    const fullKey = folder ? `${folder.replace(/^\/|\/$/g, '')}/${key}` : key;

    // Determine content type
    const mimeType = contentType || file.mimeType;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
      throw new StorageServiceError(
        'INVALID_FILE_TYPE',
        `File type ${mimeType} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      );
    }

    // Validate file size (10MB default max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new StorageServiceError(
        'FILE_TOO_LARGE',
        `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`
      );
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: file.buffer,
        ContentType: mimeType,
        Metadata: metadata,
        ACL: isPublic ? 'public-read' : 'private',
      });

      await this.s3Client.send(command);

      const storedFile: StoredFile = {
        id: crypto.randomUUID(),
        originalName: file.originalName,
        storedName: key,
        mimeType,
        size: file.size,
        path: fullKey,
        url: this.getPublicUrl(fullKey),
        bucket: this.bucket,
        metadata,
        createdAt: new Date(),
      };

      logger.info(`[S3Storage] File uploaded successfully: ${fullKey}`);
      return storedFile;
    } catch (error) {
      logger.error(`[S3Storage] Upload failed for ${fullKey}:`, error);
      throw new StorageServiceError(
        'UPLOAD_FAILED',
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Download a file from S3
   */
  async downloadFile(key: string): Promise<{ buffer: Buffer; contentType: string; metadata: Record<string, string> }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new StorageServiceError('FILE_NOT_FOUND', `File not found: ${key}`);
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      logger.info(`[S3Storage] File downloaded successfully: ${key}`);

      return {
        buffer,
        contentType: response.ContentType || 'application/octet-stream',
        metadata: response.Metadata || {},
      };
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NoSuchKey') {
        throw new StorageServiceError('FILE_NOT_FOUND', `File not found: ${key}`);
      }
      logger.error(`[S3Storage] Download failed for ${key}:`, error);
      throw new StorageServiceError(
        'DOWNLOAD_FAILED',
        `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      logger.info(`[S3Storage] File deleted successfully: ${key}`);
      return true;
    } catch (error) {
      logger.error(`[S3Storage] Delete failed for ${key}:`, error);
      if (error instanceof S3ServiceException && error.name === 'NoSuchKey') {
        return false;
      }
      throw new StorageServiceError(
        'DELETE_FAILED',
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a pre-signed URL for downloading a file
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await awsGetSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      logger.debug(`[S3Storage] Signed URL generated for: ${key}`);
      return signedUrl;
    } catch (error) {
      logger.error(`[S3Storage] Failed to generate signed URL for ${key}:`, error);
      throw new StorageServiceError(
        'SIGNED_URL_FAILED',
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a pre-signed URL for uploading a file
   */
  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<{ uploadUrl: string; key: string }> {
    // Validate content type
    if (!ALLOWED_FILE_TYPES.includes(contentType)) {
      throw new StorageServiceError(
        'INVALID_FILE_TYPE',
        `File type ${contentType} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      );
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await awsGetSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      logger.debug(`[S3Storage] Signed upload URL generated for: ${key}`);
      return { uploadUrl, key };
    } catch (error) {
      logger.error(`[S3Storage] Failed to generate signed upload URL for ${key}:`, error);
      throw new StorageServiceError(
        'SIGNED_URL_FAILED',
        `Failed to generate signed upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List files with a given prefix
   */
  async listFiles(
    prefix: string = '',
    maxKeys: number = 100,
    continuationToken?: string
  ): Promise<ListFilesResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      });

      const response = await this.s3Client.send(command);

      const files: S3FileMetadata[] = (response.Contents || []).map((item: _Object) => ({
        key: item.Key || '',
        bucket: this.bucket,
        contentLength: item.Size,
        lastModified: item.LastModified,
        etag: item.ETag,
      }));

      logger.debug(`[S3Storage] Listed ${files.length} files with prefix: ${prefix}`);

      return {
        files,
        continuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
      };
    } catch (error) {
      logger.error(`[S3Storage] Failed to list files with prefix ${prefix}:`, error);
      throw new StorageServiceError(
        'LIST_FAILED',
        `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Copy a file within S3
   */
  async copyFile(sourceKey: string, destKey: string): Promise<boolean> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destKey,
      });

      await this.s3Client.send(command);
      logger.info(`[S3Storage] File copied from ${sourceKey} to ${destKey}`);
      return true;
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NoSuchKey') {
        throw new StorageServiceError('FILE_NOT_FOUND', `Source file not found: ${sourceKey}`);
      }
      logger.error(`[S3Storage] Failed to copy file from ${sourceKey} to ${destKey}:`, error);
      throw new StorageServiceError(
        'COPY_FAILED',
        `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key: string): Promise<S3FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        bucket: this.bucket,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
      };
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NotFound') {
        return null;
      }
      logger.error(`[S3Storage] Failed to get metadata for ${key}:`, error);
      throw new StorageServiceError(
        'METADATA_FAILED',
        `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    const metadata = await this.getFileMetadata(key);
    return metadata !== null;
  }

  /**
   * Generate a unique key for a file
   */
  generateUniqueKey(originalName: string, folder?: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    const key = `${timestamp}-${randomStr}${ext}`;
    return folder ? `${folder.replace(/^\/|\/$/g, '')}/${key}` : key;
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Get bucket name
   */
  getBucket(): string {
    return this.bucket;
  }

  /**
   * Get region
   */
  getRegion(): string {
    return this.region;
  }
}

// ==================== Legacy Storage Service (Local) ====================

export class StorageService {
  private config: StorageConfig;
  private adapter: StorageAdapter;

  constructor(config: Partial<StorageConfig> = {}, adapter?: StorageAdapter) {
    this.config = { ...defaultConfig, ...config };
    this.adapter = adapter || this.createLocalAdapter();
  }

  /**
   * Upload a file
   */
  async uploadFile(file: FileUpload, options: UploadOptions = {}): Promise<StoredFile> {
    // Validate file size
    if (file.size > this.config.maxFileSize) {
      throw new StorageServiceError(
        'FILE_TOO_LARGE',
        `File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
      );
    }

    // Validate mime type
    if (!this.config.allowedMimeTypes.includes(file.mimeType)) {
      throw new StorageServiceError(
        'INVALID_FILE_TYPE',
        `File type ${file.mimeType} is not allowed`
      );
    }

    // Generate unique filename
    const storedName = options.filename || this.generateFileName(file.originalName);

    return this.adapter.upload(file, storedName, options);
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: FileUpload[],
    options: UploadOptions = {}
  ): Promise<StoredFile[]> {
    return Promise.all(files.map(file => this.uploadFile(file, options)));
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<boolean> {
    return this.adapter.delete(filePath);
  }

  /**
   * Get a signed URL for temporary access
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    return this.adapter.getSignedUrl(filePath, expiresIn);
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    return this.adapter.exists(filePath);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<Partial<StoredFile> | null> {
    return this.adapter.getMetadata(filePath);
  }

  /**
   * Generate a unique filename
   */
  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${randomStr}${ext}`;
  }

  /**
   * Create a local storage adapter
   */
  private createLocalAdapter(): StorageAdapter {
    const config = this.config;
    const fs = require('fs').promises;

    return {
      async upload(file: FileUpload, storedName: string, options: UploadOptions): Promise<StoredFile> {
        const folder = options.folder || '';
        const filePath = path.join(folder, storedName);
        const fullPath = path.join(config.basePath, filePath);

        // Ensure directory exists
        const dirPath = path.dirname(fullPath);
        await fs.mkdir(dirPath, { recursive: true });

        // Write file to disk
        await fs.writeFile(fullPath, file.buffer);

        const storedFile: StoredFile = {
          id: crypto.randomUUID(),
          originalName: file.originalName,
          storedName,
          mimeType: file.mimeType,
          size: file.size,
          path: filePath,
          url: `${config.baseUrl}/${filePath}`.replace(/\\/g, '/'),
          metadata: options.metadata,
          createdAt: new Date(),
        };

        logger.info(`[Storage] File written to: ${fullPath}`);

        return storedFile;
      },

      async delete(filePath: string): Promise<boolean> {
        const fullPath = path.join(config.basePath, filePath);
        try {
          await fs.unlink(fullPath);
          logger.info(`[Storage] File deleted: ${fullPath}`);
          return true;
        } catch (error) {
          logger.warn(`[Storage] Failed to delete file: ${fullPath}`, error);
          return false;
        }
      },

      async getSignedUrl(filePath: string, _expiresIn?: number): Promise<string> {
        // For local storage, just return the direct URL
        return `${config.baseUrl}/${filePath}`.replace(/\\/g, '/');
      },

      async exists(filePath: string): Promise<boolean> {
        const fullPath = path.join(config.basePath, filePath);
        try {
          await fs.access(fullPath);
          return true;
        } catch {
          return false;
        }
      },

      async getMetadata(filePath: string): Promise<Partial<StoredFile> | null> {
        const fullPath = path.join(config.basePath, filePath);
        try {
          const stats = await fs.stat(fullPath);
          return {
            path: filePath,
            url: `${config.baseUrl}/${filePath}`.replace(/\\/g, '/'),
            size: stats.size,
            createdAt: stats.birthtime,
          };
        } catch {
          return null;
        }
      },
    };
  }
}

// ==================== Image Processing Utilities ====================

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export class ImageService {
  /**
   * Generate thumbnail URL
   */
  generateThumbnailUrl(
    originalUrl: string,
    options: ImageProcessingOptions = {}
  ): string {
    const { width = 200, height = 200, fit = 'cover', format = 'webp' } = options;

    // This would integrate with an image processing service
    // For now, return the original URL with query params
    const url = new URL(originalUrl, 'http://localhost');
    url.searchParams.set('w', String(width));
    url.searchParams.set('h', String(height));
    url.searchParams.set('fit', fit);
    url.searchParams.set('f', format);

    return url.pathname + url.search;
  }

  /**
   * Get optimized image URL
   */
  getOptimizedUrl(
    originalUrl: string,
    width: number,
    quality: number = 80
  ): string {
    const url = new URL(originalUrl, 'http://localhost');
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality));
    url.searchParams.set('f', 'webp');

    return url.pathname + url.search;
  }
}

// ==================== Error Class ====================

export class StorageServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'StorageServiceError';
  }
}

// ==================== Factory Functions ====================

// Singleton instance of S3 storage service
let s3StorageServiceInstance: S3StorageService | null = null;

export function getS3StorageService(): S3StorageService {
  if (!s3StorageServiceInstance) {
    s3StorageServiceInstance = new S3StorageService();
  }
  return s3StorageServiceInstance;
}

export function createStorageService(
  config?: Partial<StorageConfig>,
  adapter?: StorageAdapter
): StorageService {
  return new StorageService(config, adapter);
}

export function createImageService(): ImageService {
  return new ImageService();
}

export default StorageService;
