import { UpdateBookmarkDto } from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { bookmarks, User } from 'src/db/schema';

export interface BookmarkOwnershipParams {
  bookmarkId: Bookmark['id'];
  userId: User['id'];
}

export type UpdateBookmarkParams = BookmarkOwnershipParams & {
  updates: UpdateBookmarkDto;
};

export interface FindUserBookmarksParams extends PaginateSearchParams {
  userId: User['id'];
  trashed?: boolean;
}

export interface PaginateSearchParams {
  limit: number;
  offset: number;
  searchQuery?: string;
}

export type Bookmark = typeof bookmarks.$inferSelect;
