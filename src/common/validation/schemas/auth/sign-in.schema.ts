import { emailSchema } from '@/common/validation/schemas/shared/email.schema';
import { passwordSchema } from '@/common/validation/schemas/shared/password.schema';
import { z } from 'zod';

export const SignInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type SignInDto = z.infer<typeof SignInSchema>;
