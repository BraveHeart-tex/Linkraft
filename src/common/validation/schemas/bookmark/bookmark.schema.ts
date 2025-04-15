import { z } from 'zod';

export const createBookmarkSchema = z.object({
  url: z
    .string({ required_error: 'URL is required' })
    .url('Please enter a valid URL'),

  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be under 255 characters'),

  description: z.string().max(10_000, 'Description is too long').optional(),

  tags: z
    .array(z.string().min(1, 'Tags cannot be empty').max(50, 'Tag is too long'))
    .optional(),

  thumbnail: z
    .string()
    .url('Thumbnail must be a valid URL')
    .max(255, 'Thumbnail URL is too long')
    .optional()
    .nullable(),
});

export const bulkSoftDeleteBookmarkSchema = z.object({
  bookmarkIds: z
    .array(z.number())
    .length(1, 'Please provide at least one bookmark to delete.'),
});

export type BulkSoftDeleteBookmarkDto = z.infer<
  typeof bulkSoftDeleteBookmarkSchema
>;

export type CreateBookmarkSchemaDto = z.infer<typeof createBookmarkSchema>;

export const updateBookmarkSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(255, 'Title must be under 255 characters')
      .optional(),

    description: z.string().max(10_000, 'Description is too long').optional(),

    tags: z
      .array(
        z.string().min(1, 'Tags cannot be empty').max(50, 'Tag is too long')
      )
      .optional(),

    thumbnail: z
      .string()
      .url('Thumbnail must be a valid URL')
      .max(255, 'Thumbnail URL is too long')
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'You must provide at least one field to update',
  });
