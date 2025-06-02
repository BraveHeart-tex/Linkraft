import {
  isAbsoluteHttpUrl,
  isDataImageUrl,
  isProtocolRelativeUrl,
  isRelativePath,
} from '@/common/utils/url.utils';
import { z } from 'zod';

export const faviconUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) =>
      isAbsoluteHttpUrl(val) ||
      isProtocolRelativeUrl(val) ||
      isRelativePath(val) ||
      isDataImageUrl(val),
    {
      message: 'Invalid favicon URL format',
    }
  );
