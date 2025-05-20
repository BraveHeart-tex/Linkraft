import { emailSchema } from '@/common/validation/schemas/shared/email.schema';
import { passwordSchema } from '@/common/validation/schemas/shared/password.schema';
import { z } from 'zod';

export const SignUpSchema = z.object({
  visibleName: z
    .string({
      required_error: 'Please provide a visible name',
    })
    .min(1, 'Please provide a visible name')
    .max(255, 'Visible name cannot be more than 255 characters'),
  email: emailSchema,
  password: passwordSchema,
});

export type SignUpDto = z.infer<typeof SignUpSchema>;
