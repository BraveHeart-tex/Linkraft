import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import {
  BookmarkInsertDto,
  bookmarks,
  bookmarkTags,
  collections,
  tags,
  User,
} from 'src/db/schema';
import {
  Bookmark,
  BookmarkOwnershipParams,
  FindUserBookmarksParams,
  UpdateBookmarkParams,
} from './bookmark.types';
import {
  and,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';

@Injectable()
export class BookmarkRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}

  async findAllByUserId({
    userId,
    limit = 10,
    offset = 0,
    searchQuery = '',
    trashed = false,
  }: FindUserBookmarksParams) {
    const trashedFilter = trashed
      ? isNotNull(bookmarks.deletedAt)
      : isNull(bookmarks.deletedAt);

    const query = this.txHost.tx
      .select({
        bookmark: bookmarks,
        tags: sql`COALESCE(
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
      .where(and(eq(bookmarks.userId, userId), trashedFilter))
      .leftJoin(bookmarkTags, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .leftJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .leftJoin(collections, eq(bookmarks.collectionId, collections.id))
      .groupBy(bookmarks.id, collections.id)
      .$dynamic();

    if (searchQuery) {
      query.where(
        or(
          ilike(bookmarks.title, `%${searchQuery}%`),
          ilike(bookmarks.description, `%${searchQuery}%`)
        )
      );
    }

    query.limit(limit).offset(offset);

    const result = await query.execute();

    return result.map((row) => ({
      ...row.bookmark,
      tags: row.tags || [],
      collection: row.collection,
    }));
  }

  findByIdAndUserId({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.txHost.tx.query.bookmarks.findFirst({
      where: () =>
        and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)),
    });
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

  updateByIdAndUserId({ bookmarkId, updates, userId }: UpdateBookmarkParams) {
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
}
