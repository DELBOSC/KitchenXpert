/**
 * MIME Type Constants and Utilities
 * Provides MIME type mappings and utility functions.
 */

/**
 * Common MIME types mapped to file extensions.
 */
export const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/x-icon': 'ico',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',

  // Documents
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'application/vnd.oasis.opendocument.presentation': 'odp',
  'application/rtf': 'rtf',

  // Text
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'text/csv': 'csv',
  'text/xml': 'xml',
  'text/markdown': 'md',
  'text/calendar': 'ics',

  // Application
  'application/json': 'json',
  'application/xml': 'xml',
  'application/javascript': 'js',
  'application/typescript': 'ts',
  'application/x-yaml': 'yaml',
  'application/x-www-form-urlencoded': 'form',

  // Archives
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
  'application/gzip': 'gz',
  'application/x-tar': 'tar',
  'application/x-bzip2': 'bz2',

  // Audio
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'weba',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/midi': 'midi',
  'audio/x-m4a': 'm4a',

  // Video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'mkv',
  'video/x-flv': 'flv',
  'video/mpeg': 'mpeg',

  // Fonts
  'font/woff': 'woff',
  'font/woff2': 'woff2',
  'font/ttf': 'ttf',
  'font/otf': 'otf',
  'application/font-woff': 'woff',
  'application/font-woff2': 'woff2',

  // Binary/Other
  'application/octet-stream': 'bin',
  'application/x-shockwave-flash': 'swf',
  'application/java-archive': 'jar',
  'application/x-executable': 'exe',
  'application/x-msdownload': 'exe',
};

/**
 * File extensions mapped to MIME types.
 */
export const EXTENSION_MIME_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TYPE_EXTENSIONS).map(([mime, ext]) => [ext, mime])
);

// Add additional extension mappings
EXTENSION_MIME_TYPES['jpeg'] = 'image/jpeg';
EXTENSION_MIME_TYPES['htm'] = 'text/html';
EXTENSION_MIME_TYPES['yml'] = 'application/x-yaml';
EXTENSION_MIME_TYPES['tif'] = 'image/tiff';

/**
 * MIME type categories.
 */
export const MIME_CATEGORIES = {
  IMAGE: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/x-icon',
    'image/avif',
    'image/heic',
    'image/heif',
  ],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'text/plain',
  ],
  SPREADSHEET: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
  ],
  PRESENTATION: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
  ],
  AUDIO: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/flac',
    'audio/midi',
    'audio/x-m4a',
  ],
  VIDEO: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/x-flv',
    'video/mpeg',
  ],
  ARCHIVE: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
    'application/x-bzip2',
  ],
  CODE: [
    'text/javascript',
    'application/javascript',
    'application/typescript',
    'text/css',
    'text/html',
    'application/json',
    'application/xml',
    'application/x-yaml',
  ],
} as const;

/**
 * Gets the file extension for a MIME type.
 * @param mimeType - The MIME type
 * @returns The file extension (without dot) or empty string if unknown
 */
export function getExtensionFromMimeType(mimeType: string): string {
  return MIME_TYPE_EXTENSIONS[mimeType] ?? '';
}

/**
 * Gets the MIME type for a file extension.
 * @param extension - The file extension (with or without dot)
 * @returns The MIME type or 'application/octet-stream' if unknown
 */
export function getMimeTypeFromExtension(extension: string): string {
  const ext = extension.startsWith('.')
    ? extension.slice(1).toLowerCase()
    : extension.toLowerCase();
  return EXTENSION_MIME_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * Checks if a MIME type belongs to a category.
 * @param mimeType - The MIME type to check
 * @param category - The category to check against
 * @returns True if the MIME type belongs to the category
 */
export function isMimeTypeInCategory(
  mimeType: string,
  category: keyof typeof MIME_CATEGORIES
): boolean {
  return (MIME_CATEGORIES[category] as readonly string[]).includes(mimeType);
}

/**
 * Gets the category of a MIME type.
 * @param mimeType - The MIME type
 * @returns The category name or null if not found
 */
export function getMimeTypeCategory(mimeType: string): keyof typeof MIME_CATEGORIES | null {
  for (const [category, types] of Object.entries(MIME_CATEGORIES)) {
    if ((types as readonly string[]).includes(mimeType)) {
      return category as keyof typeof MIME_CATEGORIES;
    }
  }
  return null;
}

/**
 * Checks if a MIME type is an image.
 * @param mimeType - The MIME type
 * @returns True if the MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Checks if a MIME type is a video.
 * @param mimeType - The MIME type
 * @returns True if the MIME type is a video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Checks if a MIME type is audio.
 * @param mimeType - The MIME type
 * @returns True if the MIME type is audio
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Checks if a MIME type is text.
 * @param mimeType - The MIME type
 * @returns True if the MIME type is text
 */
export function isTextMimeType(mimeType: string): boolean {
  return mimeType.startsWith('text/') || mimeType === 'application/json';
}

/**
 * Checks if a MIME type is an application type.
 * @param mimeType - The MIME type
 * @returns True if the MIME type is an application type
 */
export function isApplicationMimeType(mimeType: string): boolean {
  return mimeType.startsWith('application/');
}

/**
 * Gets all MIME types for a category.
 * @param category - The category
 * @returns An array of MIME types
 */
export function getMimeTypesForCategory(category: keyof typeof MIME_CATEGORIES): readonly string[] {
  return MIME_CATEGORIES[category];
}

/**
 * Gets all extensions for a category.
 * @param category - The category
 * @returns An array of extensions
 */
export function getExtensionsForCategory(category: keyof typeof MIME_CATEGORIES): string[] {
  return MIME_CATEGORIES[category].map((mimeType) => getExtensionFromMimeType(mimeType));
}

/**
 * Creates an accept string for file inputs.
 * @param categories - The categories to accept
 * @returns A string suitable for the accept attribute
 */
export function createAcceptString(...categories: (keyof typeof MIME_CATEGORIES)[]): string {
  const mimeTypes = categories.flatMap((category) => [...MIME_CATEGORIES[category]]);
  return mimeTypes.join(',');
}

/**
 * Common accept strings for file inputs.
 */
export const ACCEPT_STRINGS = {
  IMAGES: createAcceptString('IMAGE'),
  DOCUMENTS: createAcceptString('DOCUMENT'),
  SPREADSHEETS: createAcceptString('SPREADSHEET'),
  PRESENTATIONS: createAcceptString('PRESENTATION'),
  AUDIO: createAcceptString('AUDIO'),
  VIDEO: createAcceptString('VIDEO'),
  ARCHIVES: createAcceptString('ARCHIVE'),
  CODE: createAcceptString('CODE'),
  ALL_MEDIA: createAcceptString('IMAGE', 'AUDIO', 'VIDEO'),
  ALL_OFFICE: createAcceptString('DOCUMENT', 'SPREADSHEET', 'PRESENTATION'),
} as const;
