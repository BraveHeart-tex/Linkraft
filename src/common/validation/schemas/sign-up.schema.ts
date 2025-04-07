import { z } from 'zod';

export const SignUpSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Please provide a valid email'),
  password: z
    .string({
      required_error: 'Please provide a password',
    })
    .min(8, 'Password must be at least 8 characters long'),
});

export type SignUpDto = z.infer<typeof SignUpSchema>;
