import { z } from 'zod';

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type SignInDto = z.infer<typeof SignInSchema>;
