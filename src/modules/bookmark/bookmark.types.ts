import { PaginationSearchParams } from '@/modules/database/database.types';
import { UpdateBookmarkDto } from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { bookmarks, Collection, SlimTag, User } from 'src/db/schema';

export interface BookmarkOwnershipParams {
  bookmarkId: Bookmark['id'];
  userId: User['id'];
}

export type UpdateBookmarkParams = BookmarkOwnershipParams & {
  updates: UpdateBookmarkDto;
};

export interface FindUserBookmarksParams extends PaginationSearchParams {
  userId: User['id'];
  cursor: string | null;
  trashed?: boolean;
  collectionId?: Collection['id'];
}

export type Bookmark = typeof bookmarks.$inferSelect;

export interface BookmarkWithTagsAndCollection extends Bookmark {
  collection: Pick<Collection, 'id' | 'name'> | null;
  tags: SlimTag[];
}

export interface UpdateBookmarkReturn {
  success: boolean;
  updatedBookmark: BookmarkWithTagsAndCollection;
  createdTags: SlimTag[];
}
