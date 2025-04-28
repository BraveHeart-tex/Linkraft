import { UpdateBookmarkDto } from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { bookmarks, Collection, Tag, User } from 'src/db/schema';

export interface BookmarkOwnershipParams {
  bookmarkId: Bookmark['id'];
  userId: User['id'];
}

export type UpdateBookmarkParams = BookmarkOwnershipParams & {
  updates: UpdateBookmarkDto;
};

export interface FindUserBookmarksParams
  extends Omit<PaginateSearchParams, 'offset'> {
  userId: User['id'];
  cursor: number | null;
  trashed?: boolean;
}

export interface PaginateSearchParams {
  limit: number;
  offset: number;
  searchQuery?: string;
}

export type Bookmark = typeof bookmarks.$inferSelect;

export interface BookmarkWithTagsAndCollection extends Bookmark {
  collection: Pick<Collection, 'id' | 'name'> | null;
  tags: Pick<Tag, 'id' | 'name'>[];
}

export interface UpdateBookmarkReturn {
  success: boolean;
  updatedBookmark: BookmarkWithTagsAndCollection;
  createdTags: Pick<Tag, 'id' | 'name'>[];
}
