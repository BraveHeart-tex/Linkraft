import { Cursor } from '@/common/validation/schemas/shared/cursor.schema';
import { BookmarkWithTagsAndCollection } from '@/modules/bookmark/bookmark.types';
import { PaginationSearchParams } from '@/modules/database/database.types';
import type { Collection, User } from 'src/db/schema';

export interface CollectionOwnershipParams {
  userId: User['id'];
  collectionId: Collection['id'];
}

export interface FindUserCollectionsParams extends PaginationSearchParams {
  cursor: Cursor | null;
  userId: User['id'];
}

export interface CollectionWithBookmarkCount extends Omit<Collection, 'tsv'> {
  bookmarkCount: number;
}

export interface CollectionWithBookmarkDetails extends Collection {
  bookmarks: BookmarkWithTagsAndCollection[];
  nextBookmarkCursor: string | null;
}
