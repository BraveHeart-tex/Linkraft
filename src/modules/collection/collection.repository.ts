import { encodeCursor } from '@/common/utils/cursor.utils';
import { mapCollectionBookmark } from '@/modules/collection/collection.utils';
import { DEFAULT_PAGE_SIZE } from '@/modules/database/database.constants';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, like, lt, sql } from 'drizzle-orm';
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
  CollectionWithBookmarkDetails,
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
    return this.txHost.tx.insert(collections).values(data).returning();
  }

  async update(
    updatedData: Partial<CollectionInsertDto> & { id: Collection['id'] },
    userId: User['id']
  ) {
    return this.txHost.tx
      .update(collections)
      .set(updatedData)
      .where(
        and(eq(collections.id, updatedData.id), eq(collections.userId, userId))
      );
  }

  async getCollectionsForUser({
    searchQuery,
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
        parentId: collections.parentId,
        createdAt: collections.createdAt,
        bookmarkCount: count(
          sql`CASE WHEN ${bookmarks.deletedAt} is null THEN ${bookmarks.id} ELSE NULL END`
        ),
      })
      .from(collections)
      .leftJoin(bookmarks, eq(bookmarks.collectionId, collections.id))
      .groupBy(collections.id)
      .orderBy(desc(collections.id), desc(collections.createdAt))
      .where(
        and(
          eq(collections.userId, userId),
          cursor ? lt(collections.createdAt, cursor.createdAt) : undefined,
          searchQuery ? like(collections.name, `%${searchQuery}%`) : undefined
        )
      )
      .limit(limit);

    const lastItem = items.length === limit ? items[items.length - 1] : null;

    return {
      items,
      nextCursor: encodeCursor(
        lastItem ? { id: lastItem.id, createdAt: lastItem.createdAt } : null
      ),
    };
  }

  async getByIdForUser({
    collectionId,
    userId,
  }: CollectionOwnershipParams): Promise<CollectionWithBookmarkDetails | null> {
    const collectionWithBookmarks =
      await this.txHost.tx.query.collections.findFirst({
        where: () =>
          and(eq(collections.id, collectionId), eq(collections.userId, userId)),
        with: {
          bookmarks: {
            with: {
              collection: {
                columns: {
                  id: true,
                  name: true,
                },
              },
              bookmarkTags: {
                with: {
                  tag: {
                    columns: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
            where: () => isNull(bookmarks.deletedAt),
            limit: DEFAULT_PAGE_SIZE,
            orderBy: () => desc(collections.id),
          },
        },
      });

    if (!collectionWithBookmarks) return null;

    const lastBookmark =
      collectionWithBookmarks.bookmarks.length === DEFAULT_PAGE_SIZE
        ? collectionWithBookmarks.bookmarks[DEFAULT_PAGE_SIZE - 1]
        : null;

    return {
      ...collectionWithBookmarks,
      bookmarks: collectionWithBookmarks.bookmarks.map(mapCollectionBookmark),
      nextBookmarkCursor: encodeCursor(
        lastBookmark
          ? { id: lastBookmark.id, createdAt: lastBookmark.createdAt }
          : null
      ),
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
