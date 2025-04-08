import { z } from 'zod';

const colorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;

export const CreateCollectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(255, 'Name cannot exceed 255 characters'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(colorRegex, 'Invalid color format. Use a hex code like #ffffff')
    .optional(),
});

export const UpdateCollectionSchema = CreateCollectionSchema.optional();

export type CreateCollectionDto = z.infer<typeof CreateCollectionSchema>;
