import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  bookmarks,
  Collection,
  CollectionInsertDto,
  collections,
  User,
} from 'src/db/schema';
import { and, count, eq, sql } from 'drizzle-orm';
import { CollectionOwnershipParams } from './collection.types';
import { QueryResult } from 'pg';

@Injectable()
export class CollectionRepository {
  constructor(private readonly txHost: TransactionHost<DbTransactionAdapter>) {}
  async create(data: CollectionInsertDto) {
    const insertedCollection = await this.txHost.tx
      .insert(collections)
      .values(data)
      .returning()
      .execute();
    return insertedCollection[0] as Collection;
  }

  async bulkCreate(data: CollectionInsertDto[]) {
    return await this.txHost.tx.insert(collections).values(data).returning();
  }

  async update(
    updatedData: Partial<CollectionInsertDto> & { id: number },
    userId: User['id']
  ) {
    return await this.txHost.tx
      .update(collections)
      .set(updatedData)
      .where(
        and(eq(collections.id, updatedData.id), eq(collections.userId, userId))
      );
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
        bookmarkCount: count(bookmarks.id),
      })
      .from(collections)
      .leftJoin(bookmarks, eq(bookmarks.collectionId, collections.id))
      .groupBy(collections.id)
      .where(eq(collections.userId, userId));
  }

  async getByIdForUser({ collectionId, userId }: CollectionOwnershipParams) {
    return this.txHost.tx.query.collections.findFirst({
      where: () =>
        and(eq(collections.id, collectionId), eq(collections.userId, userId)),
      with: {
        bookmarks: true,
      },
    });
  }

  deleteUserCollection({ collectionId, userId }: CollectionOwnershipParams) {
    return this.txHost.tx
      .delete(collections)
      .where(
        and(eq(collections.id, collectionId), eq(collections.userId, userId))
      );
  }

  async userHasAccessToCollection({
    collectionId,
    userId,
  }: CollectionOwnershipParams): Promise<boolean> {
    const result: QueryResult<{ user_has_access: boolean }> =
      await this.txHost.tx.execute(
        sql`SELECT exists (SELECT 1 FROM ${collections} WHERE ${collections.id} = ${collectionId} AND ${collections.userId} = ${userId}) as user_has_access`
      );

    return !!result.rows[0]?.user_has_access;
  }
}
