import { UpdateBookmarkDto } from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { bookmarks, User } from 'src/db/schema';

export interface BookmarkOwnershipParams {
  bookmarkId: Bookmark['id'];
  userId: User['id'];
}

export type UpdateBookmarkParams = BookmarkOwnershipParams & {
  updates: UpdateBookmarkDto;
};

export type Bookmark = typeof bookmarks.$inferSelect;
