/**
 * Types pour le stockage de fichiers et médias
 */

import { BaseEntity, ID } from './base.types';

export type StorageProvider = 'local' | 's3' | 'gcs' | 'azure' | 'cloudinary';
export type FileType = 'image' | 'video' | 'document' | 'model' | 'archive' | 'other';
export type FileStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'deleted';

export interface StorageFile extends BaseEntity {
  userId: ID;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: FileType;
  status: FileStatus;
  provider: StorageProvider;
  bucket: string;
  key: string;
  url: string;
  thumbnailUrl?: string | null;
  metadata?: FileMetadata;
  processingInfo?: ProcessingInfo;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  quality?: number;
  checksum?: string;
  exif?: Record<string, unknown>;
  tags?: string[];
}

export interface ProcessingInfo {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  output?: {
    thumbnails?: string[];
    variants?: FileVariant[];
  };
}

export interface FileVariant {
  name: string;
  url: string;
  width?: number;
  height?: number;
  size: number;
  format: string;
}

export interface UploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  generateThumbnails: boolean;
  thumbnailSizes?: Array<{
    name: string;
    width: number;
    height: number;
  }>;
  imageOptimization?: {
    enabled: boolean;
    quality: number;
    format: 'jpeg' | 'png' | 'webp' | 'avif';
    maxWidth?: number;
    maxHeight?: number;
  };
}

export interface UploadRequest {
  file: File | Buffer;
  filename: string;
  mimeType: string;
  folder?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UploadResponse {
  fileId: ID;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
}

export interface SignedUrlRequest {
  fileId?: ID;
  key?: string;
  expiresIn?: number;
  contentType?: string;
  contentDisposition?: 'inline' | 'attachment';
}

export interface SignedUrlResponse {
  url: string;
  expiresAt: Date;
  method: 'GET' | 'PUT';
}

export interface StorageQuota {
  userId: ID;
  used: number;
  limit: number;
  unit: 'bytes' | 'MB' | 'GB';
  filesCount: number;
  filesLimit?: number;
}

export interface BulkDeleteRequest {
  fileIds: ID[];
  permanent?: boolean;
}

export interface BulkDeleteResponse {
  deleted: ID[];
  failed: Array<{
    fileId: ID;
    error: string;
  }>;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<
    FileType,
    {
      count: number;
      size: number;
    }
  >;
  byProvider: Record<
    StorageProvider,
    {
      count: number;
      size: number;
    }
  >;
}
