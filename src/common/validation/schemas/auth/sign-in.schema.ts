import { EmailSchema } from '@/common/validation/schemas/shared/email.schema';
import { passwordSchema } from '@/common/validation/schemas/shared/password.schema';
import { z } from 'zod';

export const SignInSchema = z.object({
  email: EmailSchema,
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof SignInSchema>;
