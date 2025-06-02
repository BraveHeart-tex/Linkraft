import { SearchResultCursor } from 'src/modules/search/search.types';

export const encodeSearchCursor = (rank: number | null, id: string): string => {
  const cursorObj = { rank, id };
  const json = JSON.stringify(cursorObj);
  return Buffer.from(json).toString('base64');
};

export const decodeSearchCursor = (
  encodedCursor: string
): SearchResultCursor | null => {
  try {
    const json = Buffer.from(encodedCursor, 'base64').toString('utf-8');
    const obj = JSON.parse(json);
    if (!obj || typeof obj.id !== 'string') return null;
    return {
      rank: typeof obj.rank === 'number' ? obj.rank : null,
      id: obj.id,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const toTsQueryString = (query: string): string => {
  return query
    .replace(/\s+$/, '')
    .replace(/:/g, '\\:') // Escape colons
    .replace(/&/g, ' & ') // Replace AND with space
    .replace(/\s+/g, ' & ') // Replace multiple spaces with single space
    .replace(/'/g, "''") // Escape single quotes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/!/g, '\\!') // Escape exclamation marks
    .replace(/\|/g, '\\|') // Escape pipe characters
    .replace(/\^/g, '\\^') // Escape caret characters
    .replace(/~/g, '\\~') // Escape tilde characters
    .replace(/\?/g, '\\?'); // Escape question marks
};
