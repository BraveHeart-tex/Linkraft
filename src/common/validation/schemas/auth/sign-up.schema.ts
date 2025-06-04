import { EmailSchema } from '@/common/validation/schemas/shared/email.schema';
import { passwordSchema } from '@/common/validation/schemas/shared/password.schema';
import { z } from 'zod';

export const SignUpSchema = z.object({
  visibleName: z
    .string({
      required_error: 'Please provide a visible name',
    })
    .min(1, 'Please provide a visible name')
    .max(255, 'Visible name cannot be more than 255 characters'),
  email: EmailSchema,
  password: passwordSchema,
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
