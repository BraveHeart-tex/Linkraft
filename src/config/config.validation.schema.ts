import { z } from 'zod';

export const configSchema = z.object({
  R2_BUCKET_NAME: z.string().min(1, 'R2_BUCKET_NAME is required'),
  R2_ENDPOINT: z.string().url('R2_ENDPOINT must be a valid URL'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  FRONT_END_URL: z.string().url().min(1, 'FRONT_END_URL is required'),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z.coerce.number().min(1, 'REDIS_PORT is required'),
  REDIS_DB: z.coerce.number({ required_error: 'REDIS_DB is required' }),
  R2_CDN_URL: z
    .string({
      required_error: 'R2_CDN_URL is required',
      invalid_type_error: 'R2_CDN_URL must be a string',
    })
    .url('R2_CDN_URL must be a valid URL'),
});

export type ConfigSchema = z.infer<typeof configSchema>;
