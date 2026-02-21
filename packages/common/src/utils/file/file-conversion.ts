/**
 * File Conversion Utilities
 * Provides utility functions for converting files between formats.
 */

/**
 * Converts a file to a base64 string.
 * @param file - The file to convert
 * @returns A promise that resolves to the base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Converts a file to a data URL string.
 * @param file - The file to convert
 * @returns A promise that resolves to the data URL string
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Converts a base64 string to a Blob.
 * @param base64 - The base64 string
 * @param mimeType - The MIME type of the blob
 * @returns The Blob object
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Converts a base64 string to a File.
 * @param base64 - The base64 string
 * @param filename - The filename
 * @param mimeType - The MIME type of the file
 * @returns The File object
 */
export function base64ToFile(base64: string, filename: string, mimeType: string): File {
  const blob = base64ToBlob(base64, mimeType);
  return new File([blob], filename, { type: mimeType });
}

/**
 * Converts a data URL to a Blob.
 * @param dataUrl - The data URL string
 * @returns The Blob object
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const header = parts[0] ?? '';
  const base64 = parts[1] ?? '';
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch?.[1] ?? 'application/octet-stream';
  return base64ToBlob(base64, mimeType);
}

/**
 * Converts a data URL to a File.
 * @param dataUrl - The data URL string
 * @param filename - The filename
 * @returns The File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type });
}

/**
 * Converts a Blob to a base64 string.
 * @param blob - The Blob to convert
 * @returns A promise that resolves to the base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Converts a Blob to a data URL.
 * @param blob - The Blob to convert
 * @returns A promise that resolves to the data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Converts a file to an ArrayBuffer.
 * @param file - The file to convert
 * @returns A promise that resolves to the ArrayBuffer
 */
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Converts an ArrayBuffer to a base64 string.
 * @param buffer - The ArrayBuffer to convert
 * @returns The base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Converts a base64 string to an ArrayBuffer.
 * @param base64 - The base64 string
 * @returns The ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a file to text.
 * @param file - The file to convert
 * @param encoding - The text encoding (default: 'UTF-8')
 * @returns A promise that resolves to the text content
 */
export function fileToText(file: File, encoding: string = 'UTF-8'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file, encoding);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Creates a file from text content.
 * @param text - The text content
 * @param filename - The filename
 * @param mimeType - The MIME type (default: 'text/plain')
 * @returns The File object
 */
export function textToFile(
  text: string,
  filename: string,
  mimeType: string = 'text/plain'
): File {
  const blob = new Blob([text], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * Creates a downloadable URL from a Blob.
 * @param blob - The Blob to create URL from
 * @returns The object URL
 */
export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revokes an object URL.
 * @param url - The object URL to revoke
 */
export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Downloads a file to the user's device.
 * @param file - The file or blob to download
 * @param filename - The filename to use
 */
export function downloadFile(file: Blob | File, filename: string): void {
  const url = createObjectUrl(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  revokeObjectUrl(url);
}

/**
 * Downloads content as a file.
 * @param content - The content to download
 * @param filename - The filename
 * @param mimeType - The MIME type
 */
export function downloadContent(
  content: string | Blob | ArrayBuffer,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof ArrayBuffer) {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = new Blob([content], { type: mimeType });
  }
  downloadFile(blob, filename);
}

/**
 * Converts JSON data to a file.
 * @param data - The data to convert
 * @param filename - The filename
 * @param pretty - Whether to pretty-print the JSON (default: true)
 * @returns The File object
 */
export function jsonToFile(
  data: unknown,
  filename: string,
  pretty: boolean = true
): File {
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  return textToFile(json, filename, 'application/json');
}

/**
 * Reads JSON data from a file.
 * @param file - The file to read
 * @returns A promise that resolves to the parsed JSON data
 */
export async function fileToJson<T = unknown>(file: File): Promise<T> {
  const text = await fileToText(file);
  return JSON.parse(text) as T;
}

/**
 * Reads a file as binary string.
 * @param file - The file to read
 * @returns A promise that resolves to the binary string
 */
export function fileToBinaryString(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Concatenates multiple files into one.
 * @param files - The files to concatenate
 * @param mimeType - The MIME type of the result
 * @returns A promise that resolves to the concatenated Blob
 */
export async function concatenateFiles(files: File[], mimeType?: string): Promise<Blob> {
  const buffers = await Promise.all(files.map(fileToArrayBuffer));
  const resultMimeType = mimeType ?? files[0]?.type ?? 'application/octet-stream';
  return new Blob(buffers, { type: resultMimeType });
}
