import { z } from 'zod';

export const emailSchema = z
  .string({
    required_error: 'Email is required',
  })
  .email('Please provide a valid email');
