/**
 * Image Downloader Service
 *
 * Downloads and processes product images from scraped URLs.
 * Handles resizing, optimization, and local/cloud storage.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface ImageDownloadOptions {
  /** Base directory for storing images */
  outputDir: string;
  /** Concurrent download limit */
  concurrency: number;
  /** Request timeout in ms */
  timeout: number;
  /** Maximum retries per image */
  maxRetries: number;
  /** Generate thumbnails */
  generateThumbnails: boolean;
  /** Thumbnail sizes */
  thumbnailSizes: ThumbnailSize[];
  /** Optimize images */
  optimize: boolean;
  /** Output format */
  outputFormat: 'original' | 'webp' | 'jpeg' | 'png';
  /** JPEG/WebP quality (1-100) */
  quality: number;
  /** Maximum image dimension (resize if larger) */
  maxDimension: number;
  /** Skip if file exists */
  skipExisting: boolean;
  /** Organize by brand */
  organizeByBrand: boolean;
  /** User agent for requests */
  userAgent: string;
  /** Referer header */
  referer?: string;
}

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface DownloadResult {
  success: boolean;
  originalUrl: string;
  localPath?: string;
  thumbnails?: Record<string, string>;
  fileSize?: number;
  width?: number;
  height?: number;
  format?: string;
  hash?: string;
  error?: string;
  duration?: number;
}

export interface BatchDownloadResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: DownloadResult[];
  duration: number;
}

export interface ImageInfo {
  url: string;
  brandId: string;
  productType: string;
  productReference: string;
  index?: number;
}

const DEFAULT_OPTIONS: ImageDownloadOptions = {
  outputDir: './data/images',
  concurrency: 5,
  timeout: 30000,
  maxRetries: 3,
  generateThumbnails: true,
  thumbnailSizes: [
    { name: 'thumb', width: 150, height: 150, fit: 'cover' },
    { name: 'small', width: 300, height: 300, fit: 'inside' },
    { name: 'medium', width: 600, height: 600, fit: 'inside' },
    { name: 'large', width: 1200, height: 1200, fit: 'inside' },
  ],
  optimize: true,
  outputFormat: 'webp',
  quality: 85,
  maxDimension: 2000,
  skipExisting: true,
  organizeByBrand: true,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

// ═══════════════════════════════════════════════════════════════════════════
// Image Downloader Class
// ═══════════════════════════════════════════════════════════════════════════

export class ImageDownloader {
  private options: ImageDownloadOptions;
  private axiosInstance: AxiosInstance;
  private limit: ReturnType<typeof pLimit>;
  private downloadedHashes: Set<string> = new Set();

  constructor(options: Partial<ImageDownloadOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.limit = pLimit(this.options.concurrency);

    this.axiosInstance = axios.create({
      timeout: this.options.timeout,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      headers: {
        'User-Agent': this.options.userAgent,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Single Image Download
  // ═══════════════════════════════════════════════════════════════════════════

  async downloadImage(imageInfo: ImageInfo): Promise<DownloadResult> {
    const startTime = Date.now();
    const { url, brandId, productType, productReference, index = 0 } = imageInfo;

    try {
      // Generate output path
      const outputPath = this.generateOutputPath(brandId, productType, productReference, index);
      const thumbPaths: Record<string, string> = {};

      // Check if exists
      if (this.options.skipExisting) {
        const mainPath = this.getFullPath(outputPath);
        try {
          await fs.access(mainPath);
          logger.debug('Image already exists, skipping', { url, path: mainPath });
          return {
            success: true,
            originalUrl: url,
            localPath: outputPath,
            duration: Date.now() - startTime,
          };
        } catch {
          // File doesn't exist, continue download
        }
      }

      // Download image
      const response = await this.fetchWithRetry(url);

      // Validate Content-Type is an image
      const contentType = response.headers?.['content-type'] || '';
      if (contentType && !contentType.startsWith('image/')) {
        logger.warn('Non-image content type received, skipping', {
          url,
          contentType,
        });
        return {
          success: false,
          originalUrl: url,
          error: `Invalid content type: ${contentType} (expected image/*)`,
          duration: Date.now() - startTime,
        };
      }

      const buffer = Buffer.from(response.data);

      // Check for duplicate by hash
      const hash = this.hashBuffer(buffer);
      if (this.downloadedHashes.has(hash)) {
        logger.debug('Duplicate image detected', { url, hash });
        return {
          success: true,
          originalUrl: url,
          hash,
          duration: Date.now() - startTime,
        };
      }
      this.downloadedHashes.add(hash);

      // Process image
      let image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize if too large
      if (metadata.width && metadata.height) {
        const maxDim = this.options.maxDimension;
        if (metadata.width > maxDim || metadata.height > maxDim) {
          image = image.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
        }
      }

      // Convert format and optimize
      let processedBuffer: Buffer;
      let finalFormat: string;

      switch (this.options.outputFormat) {
        case 'webp':
          processedBuffer = await image.webp({ quality: this.options.quality }).toBuffer();
          finalFormat = 'webp';
          break;
        case 'jpeg':
          processedBuffer = await image.jpeg({ quality: this.options.quality, mozjpeg: true }).toBuffer();
          finalFormat = 'jpg';
          break;
        case 'png':
          processedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
          finalFormat = 'png';
          break;
        default:
          processedBuffer = await image.toBuffer();
          finalFormat = metadata.format || 'jpg';
      }

      // Save main image
      const mainPath = this.getFullPath(outputPath, finalFormat);
      await this.ensureDir(path.dirname(mainPath));
      await fs.writeFile(mainPath, processedBuffer);

      // Generate thumbnails
      if (this.options.generateThumbnails) {
        for (const size of this.options.thumbnailSizes) {
          const thumbPath = this.getThumbPath(outputPath, size.name, finalFormat);
          await this.ensureDir(path.dirname(thumbPath));

          const thumbBuffer = await sharp(buffer)
            .resize(size.width, size.height, { fit: size.fit, withoutEnlargement: true })
            .webp({ quality: this.options.quality })
            .toBuffer();

          await fs.writeFile(thumbPath, thumbBuffer);
          thumbPaths[size.name] = this.getRelativePath(thumbPath);
        }
      }

      const finalMetadata = await sharp(processedBuffer).metadata();

      logger.debug('Image downloaded successfully', {
        url,
        path: mainPath,
        size: processedBuffer.length,
        dimensions: `${finalMetadata.width}x${finalMetadata.height}`,
      });

      return {
        success: true,
        originalUrl: url,
        localPath: this.getRelativePath(mainPath),
        thumbnails: thumbPaths,
        fileSize: processedBuffer.length,
        width: finalMetadata.width,
        height: finalMetadata.height,
        format: finalFormat,
        hash,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Image download failed', { url, error: errorMessage });

      return {
        success: false,
        originalUrl: url,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Batch Download
  // ═══════════════════════════════════════════════════════════════════════════

  async downloadBatch(images: ImageInfo[]): Promise<BatchDownloadResult> {
    const startTime = Date.now();
    const results: DownloadResult[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    logger.info(`Starting batch download of ${images.length} images`);

    const downloadPromises = images.map((imageInfo) =>
      this.limit(async () => {
        const result = await this.downloadImage(imageInfo);
        results.push(result);

        if (result.success) {
          if (result.localPath) {
            successful++;
          } else {
            skipped++; // Duplicate
          }
        } else {
          failed++;
        }

        // Log progress every 10 images
        const processed = successful + failed + skipped;
        if (processed % 10 === 0) {
          logger.info(`Download progress: ${processed}/${images.length}`);
        }

        return result;
      })
    );

    await Promise.all(downloadPromises);

    const duration = Date.now() - startTime;

    logger.info('Batch download completed', {
      total: images.length,
      successful,
      failed,
      skipped,
      duration: `${Math.round(duration / 1000)}s`,
    });

    return {
      total: images.length,
      successful,
      failed,
      skipped,
      results,
      duration,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Product Images Download
  // ═══════════════════════════════════════════════════════════════════════════

  async downloadProductImages(
    brandId: string,
    productType: string,
    productReference: string,
    imageUrls: string[]
  ): Promise<{
    mainImage?: string;
    thumbnails?: Record<string, string>;
    additionalImages: string[];
    results: DownloadResult[];
  }> {
    const images: ImageInfo[] = imageUrls.map((url, index) => ({
      url,
      brandId,
      productType,
      productReference,
      index,
    }));

    const batchResult = await this.downloadBatch(images);

    const successfulResults = batchResult.results.filter((r) => r.success && r.localPath);

    return {
      mainImage: successfulResults[0]?.localPath,
      thumbnails: successfulResults[0]?.thumbnails,
      additionalImages: successfulResults.slice(1).map((r) => r.localPath!),
      results: batchResult.results,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private async fetchWithRetry(url: string, attempt = 1): Promise<any> {
    try {
      const config: any = {};

      if (this.options.referer) {
        config.headers = { Referer: this.options.referer };
      }

      return await this.axiosInstance.get(url, config);
    } catch (error) {
      if (attempt < this.options.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.debug(`Retry ${attempt}/${this.options.maxRetries} for ${url} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  }

  private generateOutputPath(
    brandId: string,
    productType: string,
    productReference: string,
    index: number
  ): string {
    const sanitizedRef = this.sanitizeFilename(productReference);
    const indexSuffix = index > 0 ? `-${index}` : '';

    if (this.options.organizeByBrand) {
      return path.join(brandId, productType, `${sanitizedRef}${indexSuffix}`);
    }

    return path.join(productType, `${brandId}-${sanitizedRef}${indexSuffix}`);
  }

  private getFullPath(relativePath: string, extension?: string): string {
    const ext = extension ? `.${extension}` : '';
    return path.join(this.options.outputDir, `${relativePath}${ext}`);
  }

  private getThumbPath(relativePath: string, sizeName: string, extension: string): string {
    const dir = path.dirname(relativePath);
    const base = path.basename(relativePath);
    return path.join(this.options.outputDir, dir, 'thumbs', `${base}-${sizeName}.${extension}`);
  }

  private getRelativePath(fullPath: string): string {
    return path.relative(this.options.outputDir, fullPath);
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  private hashBuffer(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Image Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  async analyzeImage(imagePath: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
    isProgressive: boolean;
    colorSpace: string;
    dominantColor?: string;
  } | null> {
    try {
      const buffer = await fs.readFile(imagePath);
      const metadata = await sharp(buffer).metadata();
      const stats = await sharp(buffer).stats();
      const fileStats = await fs.stat(imagePath);

      // Calculate dominant color from stats
      const dominantChannel = stats.channels.reduce(
        (prev: { mean: number }, curr: { mean: number }) =>
          curr.mean > prev.mean ? curr : prev
      );

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: fileStats.size,
        hasAlpha: metadata.hasAlpha || false,
        isProgressive: metadata.isProgressive || false,
        colorSpace: metadata.space || 'srgb',
        dominantColor: this.rgbToHex(
          Math.round(stats.channels[0]?.mean || 0),
          Math.round(stats.channels[1]?.mean || 0),
          Math.round(stats.channels[2]?.mean || 0)
        ),
      };
    } catch (error) {
      logger.error('Failed to analyze image', { path: imagePath, error });
      return null;
    }
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Image Validation
  // ═══════════════════════════════════════════════════════════════════════════

  async validateImage(buffer: Buffer): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: sharp.Metadata;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();

      // Check minimum dimensions
      if (!metadata.width || !metadata.height) {
        return { valid: false, reason: 'Cannot determine image dimensions' };
      }

      if (metadata.width < 50 || metadata.height < 50) {
        return { valid: false, reason: 'Image too small (min 50x50)' };
      }

      // Check for common placeholder patterns (very small file + specific colors)
      if (buffer.length < 1000) {
        return { valid: false, reason: 'Image file too small, likely placeholder' };
      }

      // Check aspect ratio (avoid extreme aspect ratios)
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio < 0.1 || aspectRatio > 10) {
        return { valid: false, reason: 'Extreme aspect ratio' };
      }

      return { valid: true, metadata };
    } catch (error) {
      return { valid: false, reason: 'Invalid image format' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════════════════

  clearHashCache(): void {
    this.downloadedHashes.clear();
  }

  async cleanupOldImages(brandId: string, keepDays: number = 30): Promise<number> {
    const brandDir = path.join(this.options.outputDir, brandId);
    let deletedCount = 0;

    try {
      const cutoffTime = Date.now() - keepDays * 24 * 60 * 60 * 1000;

      const processDir = async (dir: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await processDir(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            if (stats.mtimeMs < cutoffTime) {
              await fs.unlink(fullPath);
              deletedCount++;
            }
          }
        }
      };

      await processDir(brandDir);
      logger.info(`Cleaned up ${deletedCount} old images for ${brandId}`);
    } catch (error) {
      logger.error('Failed to cleanup old images', { brandId, error });
    }

    return deletedCount;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════

export function createImageDownloader(options?: Partial<ImageDownloadOptions>): ImageDownloader {
  return new ImageDownloader(options);
}

export default ImageDownloader;
