import { CursorInput } from '@/common/validation/schemas/shared/cursor.schema';
import { PaginationSearchParams } from '@/modules/database/database.types';
import { UpdateBookmarkInput } from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { bookmarks, Collection, SlimTag, User } from 'src/db/schema';

export interface BookmarkOwnershipParams {
  bookmarkId: Bookmark['id'];
  userId: User['id'];
}

export type UpdateBookmarkParams = BookmarkOwnershipParams & {
  updates: UpdateBookmarkInput;
};

export interface FindUserBookmarksParams extends PaginationSearchParams {
  userId: User['id'];
  cursor: CursorInput | null;
  trashed?: boolean;
  collectionId?: Collection['id'];
}

export type Bookmark = typeof bookmarks.$inferSelect;
export type BookmarkWithFaviconUrl = Bookmark & { faviconUrl: string | null };

export interface BookmarkWithTagsAndCollection
  extends Omit<BookmarkWithFaviconUrl, 'faviconId' | 'tsv'> {
  collection: Pick<Collection, 'id' | 'name'> | null;
  tags: SlimTag[];
}

export interface UpdateBookmarkReturn {
  success: boolean;
  updatedBookmark: BookmarkWithTagsAndCollection;
  createdTags: SlimTag[];
}
