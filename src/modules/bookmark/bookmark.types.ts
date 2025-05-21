import { PaginationSearchParams } from '@/modules/database/database.types';
import { UpdateBookmarkDto } from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { bookmarks, Collection, Tag, User } from 'src/db/schema';

export interface BookmarkOwnershipParams {
  bookmarkId: Bookmark['id'];
  userId: User['id'];
}

export type UpdateBookmarkParams = BookmarkOwnershipParams & {
  updates: UpdateBookmarkDto;
};

export interface FindUserBookmarksParams extends PaginationSearchParams {
  userId: User['id'];
  cursor: number | null;
  trashed?: boolean;
  collectionId?: Collection['id'];
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
