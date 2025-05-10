import { User } from 'src/db/schema';

export const SOCKET_EVENTS = {
  BOOKMARK: {
    UPDATE: 'bookmark:update',
  },
  IMPORT: {
    PROGRESS: 'import:progress',
    COMPLETE: 'import:complete',
    ERROR: 'import:error',
  },
} as const;

export const SOCKET_NAMESPACES = {
  BOOKMARKS: 'bookmarks',
} as const;

export const SOCKET_ROOMS = {
  user: (userId: User['id']) => `user:${userId}` as const,
};
