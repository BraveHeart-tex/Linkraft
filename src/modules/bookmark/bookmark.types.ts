import { bookmarks, User } from 'src/db/schema';

export type BookmarkOwnershipParams = {
  bookmarkId: Bookmark['id'];
  userId: User['id'];
};

export type Bookmark = typeof bookmarks.$inferSelect;
