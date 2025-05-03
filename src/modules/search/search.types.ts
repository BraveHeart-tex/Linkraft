import { User } from 'src/db/schema';

export interface Cursor {
  rank: number | null;
  id: string;
}

export interface SearchAllParams {
  query: string;
  userId: User['id'];
  cursorRank: number | null;
  cursorId: string | null;
  limit: number;
}

export interface SearchResult {
  id: string;
  type: 'bookmark' | 'tag' | 'collection';
  title: string;
  description: string | null;
  rank: number;
}
