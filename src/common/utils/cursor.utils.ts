import { Cursor } from '@/common/validation/schemas/shared/cursor.schema';

export const encodeCursor = (cursor: Cursor | null | undefined): string => {
  if (!cursor) {
    return Buffer.from(JSON.stringify(null)).toString('base64');
  }

  const jsonString = JSON.stringify({
    createdAt: cursor.createdAt,
    id: cursor.id,
  });
  return Buffer.from(jsonString).toString('base64');
};
