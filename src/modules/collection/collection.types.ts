import type { Collection, User } from 'src/db/schema';

export interface CollectionOwnershipParams {
  userId: User['id'];
  collectionId: Collection['id'];
}
