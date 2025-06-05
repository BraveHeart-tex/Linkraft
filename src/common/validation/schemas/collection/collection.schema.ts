import { z } from 'zod';

export const CreateCollectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(255, 'Name cannot exceed 255 characters'),
  displayOrder: z.number(),
});

export const UpdateCollectionSchema = CreateCollectionSchema.optional();

export type CreateCollectionDto = z.infer<typeof CreateCollectionSchema>;
