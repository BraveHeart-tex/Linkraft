import { strictHttpUrlSchema } from '@/common/validation/schemas/shared/strict-url.schema';

export const isValidHttpUrl = (url: string): boolean => {
  const result = strictHttpUrlSchema.safeParse(url);
  return result.success;
};
