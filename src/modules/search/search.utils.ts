export const encodeCursor = (rank: number | null, id: string): string => {
  return Buffer.from(`${rank !== null ? rank : 'null'}:${id}`).toString(
    'base64'
  );
};

export const decodeCursor = (cursor: string): { rank: number; id: string } => {
  if (typeof cursor !== 'string' || !cursor.trim()) {
    throw new Error('Cursor must be a non-empty base64 string');
  }

  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64').toString();
  } catch {
    throw new Error('Cursor is not valid base64');
  }

  const [rankStr, id] = decoded.split(':');

  if (!rankStr || !id) {
    throw new Error('Invalid cursor format: expected "rank:id"');
  }

  const rank = parseFloat(rankStr);
  if (isNaN(rank)) {
    throw new Error('Invalid rank in cursor: must be a number');
  }

  return { rank, id };
};
