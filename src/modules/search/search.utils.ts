export const encodeCursor = (rank: number, id: string): string => {
  return Buffer.from(`${rank}:${id}`).toString('base64');
};

export const decodeCursor = (cursor: string): { rank: number; id: string } => {
  const [rank, id] = Buffer.from(cursor, 'base64').toString().split(':');
  if (!rank || !id) {
    throw new Error('Invalid cursor format');
  }
  return { rank: parseFloat(rank), id };
};
