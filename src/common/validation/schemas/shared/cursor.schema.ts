import { z } from 'zod';

export const cursorSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
});

export type Cursor = z.infer<typeof cursorSchema>;
