import { faviconUrlSchema } from '@/common/validation/schemas/shared/favicon-url.schema';
import { strictHttpUrlSchema } from '@/common/validation/schemas/shared/strict-url.schema';

export const isValidHttpUrl = (url: string): boolean => {
  const result = strictHttpUrlSchema.safeParse(url);
  return result.success;
};

export const isValidFaviconUrl = (url: string): boolean => {
  const result = faviconUrlSchema.safeParse(url);
  return result.success;
};

export const isAbsoluteHttpUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isProtocolRelativeUrl = (url: string): boolean => {
  return /^\/\/[a-z0-9.-]+/.test(url);
};

export const isRelativePath = (url: string): boolean => {
  return /^\/[^/]/.test(url); // starts with single "/"
};

export const isDataImageUrl = (url: string): boolean => {
  return (
    /^data:image\/(png|svg\+xml|jpeg|gif|x-icon|webp);base64,/.test(url) ||
    /^data:image\/(svg\+xml);utf8,/.test(url)
  );
};

export const isValidImageMimeType = (mimeType: string): boolean => {
  return new Set([
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'image/webp',
    'image/gif',
    'image/x-icon',
    'image/vnd.microsoft.icon',
  ]).has(mimeType.toLowerCase());
};
