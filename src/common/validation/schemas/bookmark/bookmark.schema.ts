import { createInsertSchema } from 'drizzle-zod';
import { bookmarks } from 'src/db/schema';
import { z } from 'zod';

export const CreateBookmarkSchema = createInsertSchema(bookmarks, {
  url: z
    .string({ required_error: 'URL is required' })
    .url('Please enter a valid URL'),
  title: z.string().max(255, 'Title must be under 255 characters').optional(),
  description: z
    .string()
    .max(10_000, 'Description is too long')
    .nullable()
    .optional(),
  isMetadataPending: z.boolean().optional(),
})
  .omit({
    id: true,
    createdAt: true,
    userId: true,
  })
  .extend({
    collectionId: z.string().nullable().optional(),
    existingTagIds: z.string().array().nullable().optional(),
    newTags: z.string().array().nullable().optional(),
  });

export const UpdateBookmarkSchema = CreateBookmarkSchema.pick({
  title: true,
  description: true,
  url: true,
  isMetadataPending: true,
  deletedAt: true,
  collectionId: true,
  existingTagIds: true,
  newTags: true,
})
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Please provide at least one field to update.',
  });

export const bulkSoftDeleteBookmarkSchema = z.object({
  bookmarkIds: z
    .array(z.string())
    .min(1, 'Please provide at least one bookmark to delete.'),
});

export type BulkSoftDeleteBookmarkDto = z.infer<
  typeof bulkSoftDeleteBookmarkSchema
>;

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkSchema>;
