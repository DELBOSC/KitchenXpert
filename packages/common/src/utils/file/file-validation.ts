/**
 * File Validation Utilities
 * Provides utility functions for validating files.
 */

import {
  getExtensionFromMimeType,
  getMimeTypeFromExtension,
  MIME_TYPE_EXTENSIONS,
} from './mime-types';

/**
 * File size units.
 */
export type FileSizeUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB';

/**
 * Converts a file size to bytes.
 * @param size - The size value
 * @param unit - The size unit
 * @returns The size in bytes
 */
export function toBytes(size: number, unit: FileSizeUnit): number {
  const multipliers: Record<FileSizeUnit, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };
  return size * multipliers[unit];
}

/**
 * Converts bytes to a specific unit.
 * @param bytes - The size in bytes
 * @param unit - The target unit
 * @returns The size in the target unit
 */
export function fromBytes(bytes: number, unit: FileSizeUnit): number {
  const divisors: Record<FileSizeUnit, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };
  return bytes / divisors[unit];
}

/**
 * Formats a file size to a human-readable string.
 * @param bytes - The size in bytes
 * @param decimals - The number of decimal places (default: 2)
 * @returns The formatted size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes: FileSizeUnit[] = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Validates that a file size is within a maximum limit.
 * @param file - The file to validate
 * @param maxSize - The maximum size
 * @param unit - The unit of the max size (default: 'MB')
 * @returns True if the file is within the size limit
 */
export function validateFileSize(file: File, maxSize: number, unit: FileSizeUnit = 'MB'): boolean {
  const maxBytes = toBytes(maxSize, unit);
  return file.size <= maxBytes;
}

/**
 * Validates that a file size is within a range.
 * @param file - The file to validate
 * @param minSize - The minimum size
 * @param maxSize - The maximum size
 * @param unit - The unit of the sizes (default: 'MB')
 * @returns True if the file is within the size range
 */
export function validateFileSizeRange(
  file: File,
  minSize: number,
  maxSize: number,
  unit: FileSizeUnit = 'MB'
): boolean {
  const minBytes = toBytes(minSize, unit);
  const maxBytes = toBytes(maxSize, unit);
  return file.size >= minBytes && file.size <= maxBytes;
}

/**
 * Validates that a file has an allowed MIME type.
 * @param file - The file to validate
 * @param allowedTypes - The list of allowed MIME types
 * @returns True if the file type is allowed
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validates that a file has an allowed extension.
 * @param file - The file to validate
 * @param allowedExtensions - The list of allowed extensions (with or without dot)
 * @returns True if the file extension is allowed
 */
export function validateFileExtension(file: File, allowedExtensions: string[]): boolean {
  const extension = getFileExtension(file.name);
  const normalizedExtensions = allowedExtensions.map((ext) =>
    ext.startsWith('.') ? ext.slice(1).toLowerCase() : ext.toLowerCase()
  );
  return normalizedExtensions.includes(extension);
}

/**
 * Gets the extension from a filename.
 * @param filename - The filename
 * @returns The extension (without dot, lowercase)
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Gets the filename without extension.
 * @param filename - The filename
 * @returns The filename without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return filename;
  }
  return filename.slice(0, lastDot);
}

/**
 * Validates that a file is an image.
 * @param file - The file to validate
 * @returns True if the file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Validates that a file is a video.
 * @param file - The file to validate
 * @returns True if the file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Validates that a file is audio.
 * @param file - The file to validate
 * @returns True if the file is audio
 */
export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/');
}

/**
 * Validates that a file is a PDF.
 * @param file - The file to validate
 * @returns True if the file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * Validates that a file is a document (PDF, Word, etc.).
 * @param file - The file to validate
 * @returns True if the file is a document
 */
export function isDocumentFile(file: File): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'text/plain',
    'text/rtf',
  ];
  return documentTypes.includes(file.type);
}

/**
 * Validates that a file is a spreadsheet.
 * @param file - The file to validate
 * @returns True if the file is a spreadsheet
 */
export function isSpreadsheetFile(file: File): boolean {
  const spreadsheetTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
  ];
  return spreadsheetTypes.includes(file.type);
}

/**
 * Validates that a file is a text file.
 * @param file - The file to validate
 * @returns True if the file is a text file
 */
export function isTextFile(file: File): boolean {
  return file.type.startsWith('text/') || file.type === 'application/json';
}

/**
 * Validates that a file is an archive.
 * @param file - The file to validate
 * @returns True if the file is an archive
 */
export function isArchiveFile(file: File): boolean {
  const archiveTypes = [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
  ];
  return archiveTypes.includes(file.type);
}

/**
 * Validates a file against multiple criteria.
 * @param file - The file to validate
 * @param options - The validation options
 * @returns An object with validation results
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    maxSizeUnit?: FileSizeUnit;
    minSize?: number;
    minSizeUnit?: FileSizeUnit;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate max size
  if (options.maxSize !== undefined) {
    const maxBytes = toBytes(options.maxSize, options.maxSizeUnit ?? 'MB');
    if (file.size > maxBytes) {
      errors.push(
        `File size exceeds maximum allowed size of ${options.maxSize} ${options.maxSizeUnit ?? 'MB'}`
      );
    }
  }

  // Validate min size
  if (options.minSize !== undefined) {
    const minBytes = toBytes(options.minSize, options.minSizeUnit ?? 'MB');
    if (file.size < minBytes) {
      errors.push(
        `File size is below minimum required size of ${options.minSize} ${options.minSizeUnit ?? 'MB'}`
      );
    }
  }

  // Validate MIME type
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    if (!validateFileType(file, options.allowedTypes)) {
      errors.push(`File type "${file.type}" is not allowed`);
    }
  }

  // Validate extension
  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    if (!validateFileExtension(file, options.allowedExtensions)) {
      const extension = getFileExtension(file.name);
      errors.push(`File extension ".${extension}" is not allowed`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if a MIME type matches an extension.
 * @param mimeType - The MIME type
 * @param extension - The extension
 * @returns True if they match
 */
export function mimeTypeMatchesExtension(mimeType: string, extension: string): boolean {
  const normalizedExt = extension.startsWith('.')
    ? extension.slice(1).toLowerCase()
    : extension.toLowerCase();
  const expectedExtension = getExtensionFromMimeType(mimeType);
  const expectedMimeType = getMimeTypeFromExtension(normalizedExt);

  return normalizedExt === expectedExtension || mimeType === expectedMimeType;
}

/**
 * Gets suggested file extensions for a MIME type.
 * @param mimeType - The MIME type
 * @returns An array of suggested extensions
 */
export function getSuggestedExtensions(mimeType: string): string[] {
  const extensions: string[] = [];

  for (const [mime, ext] of Object.entries(MIME_TYPE_EXTENSIONS)) {
    if (mime === mimeType || mime.startsWith(mimeType.split('/')[0] + '/')) {
      extensions.push(ext);
    }
  }

  return extensions;
}
