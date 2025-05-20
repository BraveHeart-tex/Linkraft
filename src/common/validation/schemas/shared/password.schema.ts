import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '@/modules/auth/auth.constants';
import { z } from 'zod';

export const passwordSchema = z
  .string({
    required_error: 'Please provide a password',
  })
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
  )
  .max(
    MAX_PASSWORD_LENGTH,
    `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`
  );
