import { encodeCursor } from '@/common/utils/cursor.utils';
import { getCurrentTimestamp } from '@/common/utils/date.utils';
import { CollectionOwnershipParams } from '@/modules/collection/collection.types';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/modules/database/database.constants';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import {
  BookmarkInsertDto,
  bookmarks,
  bookmarkTags,
  collections,
  favicons,
  Tag,
  tags,
  User,
} from 'src/db/schema';
import {
  PaginatedResult,
  TransactionalDbAdapter,
} from '../database/database.types';
import {
  Bookmark,
  BookmarkOwnershipParams,
  BookmarkWithTagsAndCollection,
  FindUserBookmarksParams,
  UpdateBookmarkParams,
} from './bookmark.types';

@Injectable()
export class BookmarkRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalDbAdapter>
  ) {}

  // TODO: Test narrow first, join second method
  async findAllByUserId({
    userId,
    limit = DEFAULT_PAGE_SIZE,
    cursor,
    searchQuery = '',
    trashed = false,
    collectionId,
  }: FindUserBookmarksParams): Promise<
    PaginatedResult<BookmarkWithTagsAndCollection>
  > {
    limit = Math.min(limit, MAX_PAGE_SIZE);

    const query = this.txHost.tx
      .select({
        bookmark: {
          id: bookmarks.id,
          userId: bookmarks.userId,
          url: bookmarks.url,
          title: bookmarks.title,
          description: bookmarks.description,
          faviconUrl: favicons.url,
          createdAt: bookmarks.createdAt,
          deletedAt: bookmarks.deletedAt,
          collectionId: bookmarks.collectionId,
          isMetadataPending: bookmarks.isMetadataPending,
        },
        tags: sql<Pick<Tag, 'id' | 'name'>[]>`COALESCE(
        json_agg(json_build_object('id', ${tags.id}, 'name', ${tags.name}))
        FILTER (WHERE ${tags.id} IS NOT NULL),
        '[]'
      )`.as('tags'),
        collection: {
          id: collections.id,
          name: collections.name,
        },
      })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          trashed
            ? isNotNull(bookmarks.deletedAt)
            : isNull(bookmarks.deletedAt),
          collectionId ? eq(bookmarks.collectionId, collectionId) : undefined,
          searchQuery
            ? or(
                ilike(bookmarks.title, `%${searchQuery}%`),
                ilike(bookmarks.description, `%${searchQuery}%`)
              )
            : undefined,
          cursor
            ? or(
                lt(bookmarks.createdAt, cursor.createdAt),
                and(
                  eq(bookmarks.createdAt, cursor.createdAt),
                  lt(bookmarks.id, cursor.id)
                )
              )
            : undefined
        )
      )
      .leftJoin(bookmarkTags, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .leftJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .leftJoin(collections, eq(bookmarks.collectionId, collections.id))
      .leftJoin(favicons, eq(bookmarks.faviconId, favicons.id))
      .groupBy(bookmarks.id, collections.id, favicons.id)
      .orderBy(desc(bookmarks.createdAt), desc(bookmarks.id))
      .$dynamic();

    query.limit(limit);

    const result = await query.execute();

    const items = result.map((row) => ({
      ...row.bookmark,
      tags: row.tags || [],
      collection: row.collection,
    }));

    const lastItem = items.length === limit ? items[items.length - 1] : null;

    return {
      items,
      nextCursor: encodeCursor(
        lastItem
          ? {
              createdAt: lastItem.createdAt,
              id: lastItem.id,
            }
          : null
      ),
    };
  }

  findByIdAndUserId({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.txHost.tx.query.bookmarks.findFirst({
      where: () =>
        and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)),
    });
  }

  async findBookmarkWithDetailsByUserId({
    bookmarkId,
    userId,
  }: BookmarkOwnershipParams): Promise<BookmarkWithTagsAndCollection | null> {
    const query = this.txHost.tx
      .select({
        bookmark: {
          id: bookmarks.id,
          userId: bookmarks.userId,
          url: bookmarks.url,
          title: bookmarks.title,
          description: bookmarks.description,
          faviconUrl: favicons.url,
          createdAt: bookmarks.createdAt,
          deletedAt: bookmarks.deletedAt,
          collectionId: bookmarks.collectionId,
          isMetadataPending: bookmarks.isMetadataPending,
        },
        tags: sql<Pick<Tag, 'id' | 'name'>[]>`COALESCE(
          json_agg(json_build_object('id', ${tags.id}, 'name', ${tags.name}))
          FILTER (WHERE ${tags.id} IS NOT NULL),
          '[]'
        )`.as('tags'),
        collection: {
          id: collections.id,
          name: collections.name,
        },
      })
      .from(bookmarks)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)))
      .leftJoin(bookmarkTags, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .leftJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .leftJoin(collections, eq(bookmarks.collectionId, collections.id))
      .leftJoin(favicons, eq(bookmarks.faviconId, favicons.id))
      .groupBy(bookmarks.id, collections.id, favicons.id)
      .limit(1)
      .$dynamic();

    const [row] = await query.execute();

    if (!row) return null;

    return {
      ...row.bookmark,
      tags: row.tags || [],
      collection: row.collection,
    };
  }

  async findWithTagsAndCollectionByIdAndUserId({
    bookmarkId,
    userId,
  }: BookmarkOwnershipParams): Promise<
    BookmarkWithTagsAndCollection | undefined
  > {
    const result = await this.txHost.tx
      .select({
        bookmark: {
          id: bookmarks.id,
          userId: bookmarks.userId,
          url: bookmarks.url,
          title: bookmarks.title,
          description: bookmarks.description,
          faviconUrl: favicons.url,
          createdAt: bookmarks.createdAt,
          deletedAt: bookmarks.deletedAt,
          collectionId: bookmarks.collectionId,
          isMetadataPending: bookmarks.isMetadataPending,
        },
        tags: sql<Pick<Tag, 'id' | 'name'>[]>`COALESCE(
          json_agg(json_build_object('id', ${tags.id}, 'name', ${tags.name}))
          FILTER (WHERE ${tags.id} IS NOT NULL),
          '[]'
        )`.as('tags'),
        collection: {
          id: collections.id,
          name: collections.name,
        },
      })
      .from(bookmarks)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)))
      .leftJoin(bookmarkTags, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .leftJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .leftJoin(favicons, eq(favicons.id, bookmarks.faviconId))
      .leftJoin(collections, eq(bookmarks.collectionId, collections.id))
      .limit(1)
      .groupBy(bookmarks.id, collections.id, favicons.id);

    if (!result[0]) return;

    return {
      ...result[0].bookmark,
      collection: result[0].collection,
      tags: result[0].tags,
    };
  }

  async create(data: BookmarkInsertDto) {
    const result = await this.txHost.tx
      .insert(bookmarks)
      .values(data)
      .returning();
    return result[0] as Bookmark;
  }

  async bulkCreate(data: BookmarkInsertDto[]) {
    return await this.txHost.tx
      .insert(bookmarks)
      .values(data)
      .returning({ id: bookmarks.id });
  }

  updateByIdAndUserId({ bookmarkId, updates, userId }: UpdateBookmarkParams) {
    if (Object.keys(updates || {}).length === 0) return;
    return this.txHost.tx
      .update(bookmarks)
      .set(updates)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
  }

  softDeleteByIdAndUserId({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.txHost.tx
      .update(bookmarks)
      .set({
        deletedAt: getCurrentTimestamp(),
      })
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.id, bookmarkId)));
  }

  async softDeleteCollectionDescendants({
    collectionId,
    userId,
  }: CollectionOwnershipParams) {
    await this.txHost.tx.execute(sql`
      WITH RECURSIVE descendant_collections AS (
        SELECT id
        FROM collections
        WHERE id = ${collectionId} AND user_id = ${userId}

        UNION ALL

        SELECT c.id
        FROM collections c
        INNER JOIN descendant_collections dc ON c.parent_id = dc.id
        WHERE c.user_id = ${userId}
      )
      UPDATE bookmarks
      SET deleted_at = ${getCurrentTimestamp()}
      WHERE collection_id IN (SELECT id FROM descendant_collections)
    `);
  }

  deleteByIdAndUserId({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.txHost.tx
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.id, bookmarkId)));
  }

  bulkSoftDeleteByIdsAndUserId(
    bookmarkIds: Bookmark['id'][],
    userId: User['id']
  ) {
    return this.txHost.tx
      .update(bookmarks)
      .set({
        deletedAt: getCurrentTimestamp(),
      })
      .where(
        and(eq(bookmarks.userId, userId), inArray(bookmarks.id, bookmarkIds))
      )
      .returning({
        deleteId: bookmarks.id,
      });
  }

  async bulkDeleteTrashedUserBookmarks(userId: User['id']) {
    return this.txHost.tx
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNotNull(bookmarks.deletedAt)))
      .returning({
        id: bookmarks.id,
      });
  }

  bulkDelete(userId: User['id'], bookmarkIds: Bookmark['id'][]) {
    return this.txHost.tx
      .delete(bookmarks)
      .where(
        and(eq(bookmarks.userId, userId), inArray(bookmarks.id, bookmarkIds))
      )
      .returning({
        id: bookmarks.id,
      });
  }
}
