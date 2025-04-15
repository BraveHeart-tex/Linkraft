import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { BookmarkInsertDto, bookmarks, User } from 'src/db/schema';
import {
  Bookmark,
  BookmarkOwnershipParams,
  UpdateBookmarkParams,
} from './bookmark.types';
import { and, eq, inArray, sql } from 'drizzle-orm';

@Injectable()
export class BookmarkRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}

  findAllByUserId(userId: User['id']) {
    return this.txHost.tx
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId));
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
