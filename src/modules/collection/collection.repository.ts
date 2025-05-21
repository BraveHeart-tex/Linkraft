import { DEFAULT_PAGE_SIZE } from '@/modules/database/database.constants';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { QueryResult } from 'pg';
import {
  bookmarks,
  Collection,
  CollectionInsertDto,
  collections,
  User,
} from 'src/db/schema';
import {
  PaginatedResult,
  TransactionalDbAdapter,
} from '../database/database.types';
import {
  CollectionOwnershipParams,
  CollectionWithBookmarkCount,
  FindUserCollectionsParams,
} from './collection.types';

@Injectable()
export class CollectionRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalDbAdapter>
  ) {}
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

  async getCollectionsForUser({
    userId,
    cursor,
    limit = DEFAULT_PAGE_SIZE,
  }: FindUserCollectionsParams): Promise<
    PaginatedResult<CollectionWithBookmarkCount>
  > {
    limit = Math.min(limit, DEFAULT_PAGE_SIZE);

    const items = await this.txHost.tx
      .select({
        id: collections.id,
        userId: collections.userId,
        name: collections.name,
        description: collections.description,
        createdAt: collections.createdAt,
        color: collections.color,
        bookmarkCount: count(
          sql`CASE WHEN ${bookmarks.deletedAt} is null THEN ${bookmarks.id} ELSE NULL END`
        ),
      })
      .from(collections)
      .leftJoin(bookmarks, eq(bookmarks.collectionId, collections.id))
      .groupBy(collections.id)
      .orderBy(desc(collections.id))
      .where(
        and(
          eq(collections.userId, userId),
          cursor ? lt(collections.id, cursor) : undefined
        )
      )
      .limit(limit);

    return {
      items,
      nextCursor: items.length === limit ? items[items.length - 1]?.id : null,
    };
  }

  async getByIdForUser({ collectionId, userId }: CollectionOwnershipParams) {
    const collectionWithBookmarks =
      await this.txHost.tx.query.collections.findFirst({
        where: () =>
          and(eq(collections.id, collectionId), eq(collections.userId, userId)),
        with: {
          bookmarks: {
            where: () => isNull(bookmarks.deletedAt),
            limit: DEFAULT_PAGE_SIZE,
            orderBy: () => desc(collections.id),
          },
        },
      });

    if (!collectionWithBookmarks) return null;

    return {
      ...collectionWithBookmarks,
      nextBookmarkCursor:
        collectionWithBookmarks.bookmarks.length === DEFAULT_PAGE_SIZE
          ? collectionWithBookmarks.bookmarks[DEFAULT_PAGE_SIZE - 1]?.id
          : null,
    };
  }

  async deleteUserCollection({
    collectionId,
    userId,
  }: CollectionOwnershipParams) {
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
