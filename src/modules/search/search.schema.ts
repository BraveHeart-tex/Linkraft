import { z } from 'zod';

export const searchResultSchema = z.object({
  id: z.string(),
  type: z.enum(['bookmark', 'tag', 'collection']),
  title: z.string(),
  description: z.string().nullable(),
  rank: z.number(),
});

export const searchAllResponseSchema = z.object({
  results: z.array(searchResultSchema),
});
