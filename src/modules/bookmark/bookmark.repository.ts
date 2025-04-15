import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { BookmarkInsertDto, bookmarks, User } from 'src/db/schema';
import {
  Bookmark,
  BookmarkOwnershipParams,
  FindUserBookmarksParams,
  UpdateBookmarkParams,
} from './bookmark.types';
import { and, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';

@Injectable()
export class BookmarkRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}

  async findAllByUserId({
    userId,
    limit = 10,
    offset = 0,
    searchQuery = '',
  }: FindUserBookmarksParams) {
    const query = this.txHost.tx
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)))
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

    return query.execute();
  }

  findByIdAndUserId({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.txHost.tx.query.bookmarks.findFirst({
      where: () =>
        and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)),
    });
  }

  create(data: BookmarkInsertDto) {
    return this.txHost.tx.insert(bookmarks).values(data).returning();
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
}
