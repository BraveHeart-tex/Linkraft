import { BookmarkWithTagsAndCollection } from '@/modules/bookmark/bookmark.types';
import type { Collection, User } from 'src/db/schema';

export interface CollectionOwnershipParams {
  userId: User['id'];
  collectionId: Collection['id'];
}

export interface FindUserCollectionsParams {
  userId: User['id'];
}

export interface CollectionWithBookmarkCount extends Omit<Collection, 'tsv'> {
  bookmarkCount: number;
}

export interface CollectionWithBookmarkDetails extends Collection {
  bookmarks: BookmarkWithTagsAndCollection[];
  nextBookmarkCursor: string | null;
}
