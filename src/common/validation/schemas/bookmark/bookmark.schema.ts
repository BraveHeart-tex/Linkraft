import { createInsertSchema } from 'drizzle-zod';
import { bookmarks } from 'src/db/schema';
import { z } from 'zod';

export const createBookmarkSchema = createInsertSchema(bookmarks, {
  url: z
    .string({ required_error: 'URL is required' })
    .url('Please enter a valid URL'),
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be under 255 characters'),
  description: z.string().max(10_000, 'Description is too long').optional(),
  thumbnail: z
    .string()
    .url('Thumbnail must be a valid URL')
    .max(255, 'Thumbnail URL is too long')
    .optional()
    .nullable(),
}).omit({
  id: true,
  createdAt: true,
  deletedAt: true,
  userId: true,
});

export const updateBookmarkSchema = createBookmarkSchema
  .pick({
    title: true,
    description: true,
    thumbnail: true,
    url: true,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Please provide at least one field to update.',
  });

export const bulkSoftDeleteBookmarkSchema = z.object({
  bookmarkIds: z
    .array(z.number())
    .length(1, 'Please provide at least one bookmark to delete.'),
});

export type BulkSoftDeleteBookmarkDto = z.infer<
  typeof bulkSoftDeleteBookmarkSchema
>;

export type CreateBookmarkDto = z.infer<typeof createBookmarkSchema>;
export type UpdateBookmarkDto = z.infer<typeof updateBookmarkSchema>;
