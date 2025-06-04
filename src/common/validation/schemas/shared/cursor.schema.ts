import { z } from 'zod';

export const CursorSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
});

export type CursorInput = z.infer<typeof CursorSchema>;
