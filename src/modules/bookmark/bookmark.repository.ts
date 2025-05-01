import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import {
  BookmarkInsertDto,
  bookmarks,
  bookmarkTags,
  collections,
  Tag,
  tags,
  User,
} from 'src/db/schema';
import {
  Bookmark,
  BookmarkOwnershipParams,
  BookmarkWithTagsAndCollection,
  FindUserBookmarksParams,
  UpdateBookmarkParams,
} from './bookmark.types';
import {
  and,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  SQL,
  sql,
} from 'drizzle-orm';

@Injectable()
export class BookmarkRepository {
  constructor(private readonly txHost: TransactionHost<DbTransactionAdapter>) {}

  async findAllByUserId({
    userId,
    limit = 10,
    cursor,
    searchQuery = '',
    trashed = false,
  }: FindUserBookmarksParams): Promise<{
    items: BookmarkWithTagsAndCollection[];
    nextCursor: number | null;
  }> {
    const conditions = [
      eq(bookmarks.userId, userId),
      trashed ? isNotNull(bookmarks.deletedAt) : isNull(bookmarks.deletedAt),
      searchQuery
        ? or(
            ilike(bookmarks.title, `%${searchQuery}%`),
            ilike(bookmarks.description, `%${searchQuery}%`)
          )
        : undefined,
      cursor ? gt(bookmarks.id, cursor) : undefined,
    ].filter((cond): cond is SQL => Boolean(cond));

    const query = this.txHost.tx
      .select({
        bookmark: bookmarks,
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
      .where(and(...conditions))
      .leftJoin(bookmarkTags, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .leftJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .leftJoin(collections, eq(bookmarks.collectionId, collections.id))
      .groupBy(bookmarks.id, collections.id)
      .orderBy(bookmarks.id)
      .$dynamic();

    query.limit(limit);

    const result = await query.execute();

    const items = result.map((row) => ({
      ...row.bookmark,
      tags: row.tags || [],
      collection: row.collection,
    }));

    const nextCursor =
      items.length === limit ? (items[items.length - 1]?.id as number) : null;

    return { items, nextCursor };
  }

  findByIdAndUserId({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.txHost.tx.query.bookmarks.findFirst({
      where: () =>
        and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)),
    });
  }

  async findWithTagsAndCollectionByIdAndUserId({
    bookmarkId,
    userId,
  }: BookmarkOwnershipParams): Promise<
    BookmarkWithTagsAndCollection | undefined
  > {
    const result = await this.txHost.tx
      .select({
        bookmark: bookmarks,
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
      .limit(1)
      .groupBy(bookmarks.id, collections.id);

    if (!result[0]) return;

    return {
      ...result[0].bookmark,
      collection: result[0].collection,
      tags: result[0].tags,
    };
  }

  async userHasBookmarkWithUrl({
    url,
    userId,
  }: {
    url: string;
    userId: User['id'];
  }) {
    const result = await this.txHost.tx
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.url, url)));

    return result[0];
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
        deletedAt: sql`NOW()`,
      })
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.id, bookmarkId)));
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
        deletedAt: sql`NOW()`,
      })
      .where(
        and(eq(bookmarks.userId, userId), inArray(bookmarks.id, bookmarkIds))
      )
      .returning({
        deleteId: bookmarks.id,
      });
  }

  async findByUserIdAndUrlExcludingBookmark({
    userId,
    url,
    excludeBookmarkId,
  }: {
    userId: number;
    url: string;
    excludeBookmarkId: number;
  }) {
    return this.txHost.tx.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.url, url),
        ne(bookmarks.id, excludeBookmarkId)
      ),
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
}
