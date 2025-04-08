import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  bookmarkCollection,
  Collection,
  CollectionInsertDto,
  collections,
  User,
} from 'src/db/schema';
import { and, count, eq } from 'drizzle-orm';

@Injectable()
export class CollectionRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}
  async createCollection(data: CollectionInsertDto) {
    const insertedCollection = await this.txHost.tx
      .insert(collections)
      .values(data)
      .returning()
      .execute();
    return insertedCollection[0];
  }

  async getCollectionsForUser(userId: User['id']) {
    return this.txHost.tx
      .select({
        id: collections.id,
        userId: collections.userId,
        name: collections.name,
        description: collections.description,
        createdAt: collections.createdAt,
        isDeleted: collections.isDeleted,
        color: collections.color,
        bookmarkCount: count(bookmarkCollection.bookmarkId),
      })
      .from(collections)
      .leftJoin(
        bookmarkCollection,
        eq(bookmarkCollection.collectionId, collections.id)
      )
      .groupBy(collections.id)
      .where(eq(collections.userId, userId));
  }

  deleteUserCollection({
    collectionId,
    userId,
  }: {
    userId: User['id'];
    collectionId: Collection['id'];
  }) {
    return this.txHost.tx
      .delete(collections)
      .where(
        and(eq(collections.id, collectionId), eq(collections.userId, userId))
      );
  }
}
