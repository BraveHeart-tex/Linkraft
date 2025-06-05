import { encodeCursor } from '@/common/utils/cursor.utils';
import { mapCollectionBookmark } from '@/modules/collection/collection.utils';
import { DEFAULT_PAGE_SIZE } from '@/modules/database/database.constants';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { QueryResult } from 'pg';
import {
  bookmarks,
  Collection,
  CollectionInsertDto,
  collections,
  User,
} from 'src/db/schema';
import { TransactionalDbAdapter } from '../database/database.types';
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

  async getCollectionsForUser({ userId }: FindUserCollectionsParams): Promise<{
    items: CollectionWithBookmarkCount[];
  }> {
    const items = await this.txHost.tx
      .select({
        id: collections.id,
        userId: collections.userId,
        name: collections.name,
        parentId: collections.parentId,
        displayOrder: collections.displayOrder,
        createdAt: collections.createdAt,
        bookmarkCount: count(
          sql`CASE WHEN ${bookmarks.deletedAt} is null THEN ${bookmarks.id} ELSE NULL END`
        ),
      })
      .from(collections)
      .leftJoin(bookmarks, eq(bookmarks.collectionId, collections.id))
      .groupBy(collections.id)
      .orderBy(desc(collections.id), desc(collections.createdAt))
      .where(and(eq(collections.userId, userId)));

    return {
      items,
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
              favicon: {
                columns: {
                  url: true,
                },
              },
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
