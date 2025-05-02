import { Job } from 'bullmq';
import type { Bookmark } from 'src/modules/bookmark/bookmark.types';

export const SOCKET_EVENTS = {
  BOOKMARK: {
    SUBSCRIBE: 'bookmark:subscribe',
    UNSUBSCRIBE: 'bookmark:unsubscribe',
    UPDATE: 'bookmark:update',
  },
  IMPORT: {
    SUBSCRIBE: 'import:subscribe',
    UNSUBSCRIBE: 'import:unsubscribe',
    PROGRESS: 'import:progress',
    COMPLETE: 'import:complete',
    ERROR: 'import:error',
  },
};

export const SOCKET_NAMESPACES = {
  BOOKMARKS: 'bookmarks',
};

export const SOCKET_ROOMS = {
  bookmark: (bookmarkId: Bookmark['id']) => `bookmark:${bookmarkId}`,
  importJob: (jobId: Job['id']) => `import:${jobId}`,
};
