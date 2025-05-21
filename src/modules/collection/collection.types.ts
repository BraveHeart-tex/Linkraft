import { PaginationSearchParams } from '@/modules/database/database.types';
import type { Collection, User } from 'src/db/schema';

export interface CollectionOwnershipParams {
  userId: User['id'];
  collectionId: Collection['id'];
}

export interface FindUserCollectionsParams extends PaginationSearchParams {
  cursor: number | null;
  userId: User['id'];
}

export interface CollectionWithBookmarkCount extends Omit<Collection, 'tsv'> {
  bookmarkCount: number;
}
