/**
 * Interfaces pour le stockage de fichiers
 */

import { ID } from '../types/base.types';
import {
  StorageFile,
  UploadRequest,
  UploadResponse,
  SignedUrlRequest,
  SignedUrlResponse,
  StorageQuota,
} from '../types/storage.types';

/**
 * Interface principale pour le service de stockage
 */
export interface IStorageService {
  upload(request: UploadRequest): Promise<UploadResponse>;
  download(fileId: ID): Promise<Buffer>;
  delete(fileId: ID): Promise<void>;
  getFile(fileId: ID): Promise<StorageFile | null>;
  getSignedUrl(request: SignedUrlRequest): Promise<SignedUrlResponse>;
  getQuota(userId: ID): Promise<StorageQuota>;
}

/**
 * Interface pour le traitement d'images
 */
export interface IImageProcessor {
  resize(buffer: Buffer, options: ResizeOptions): Promise<Buffer>;
  optimize(buffer: Buffer, options?: OptimizeOptions): Promise<Buffer>;
  generateThumbnail(buffer: Buffer, size: ThumbnailSize): Promise<Buffer>;
  getMetadata(buffer: Buffer): Promise<ImageMetadata>;
  convert(buffer: Buffer, format: ImageFormat): Promise<Buffer>;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
  background?: string;
}

export interface OptimizeOptions {
  quality?: number;
  progressive?: boolean;
  format?: ImageFormat;
}

export type ThumbnailSize = 'small' | 'medium' | 'large';
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  orientation?: number;
}

/**
 * Interface pour le provider de stockage (S3, GCS, etc.)
 */
export interface IStorageProvider {
  name: string;
  upload(key: string, buffer: Buffer, options?: ProviderUploadOptions): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiresIn: number, method: 'GET' | 'PUT'): Promise<string>;
  copy(sourceKey: string, destinationKey: string): Promise<void>;
  list(prefix: string): Promise<StorageObject[]>;
}

export interface ProviderUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
  cacheControl?: string;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
}

/**
 * Interface pour la gestion des fichiers par type
 */
export interface IFileTypeHandler {
  canHandle(mimeType: string): boolean;
  process(buffer: Buffer, options?: ProcessOptions): Promise<ProcessResult>;
  validate(buffer: Buffer): Promise<boolean>;
  getMetadata(buffer: Buffer): Promise<Record<string, unknown>>;
}

export interface ProcessOptions {
  generateThumbnails?: boolean;
  extractMetadata?: boolean;
  optimize?: boolean;
}

export interface ProcessResult {
  processed: Buffer;
  thumbnails?: Buffer[];
  metadata?: Record<string, unknown>;
}
