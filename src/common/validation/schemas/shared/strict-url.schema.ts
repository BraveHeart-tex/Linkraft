import { z } from 'zod';

export const strictHttpUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    {
      message: 'Only http and https URLs are allowed',
    }
  );
