import { z } from 'zod';

export const SearchResultSchema = z.object({
  id: z.string(),
  type: z.enum(['bookmark', 'tag', 'collection']),
  title: z.string(),
  description: z.string().nullable(),
  rank: z.number().nullable(),
  url: z.string(),
});

export const SearchAllResponseSchema = z.object({
  results: z.array(SearchResultSchema),
});
