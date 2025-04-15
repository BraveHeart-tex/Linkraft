import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { Bookmark, bookmarks, User } from 'src/db/schema';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class BookmarkRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}

  getBookmarks(userId: User['id']) {
    return this.txHost.tx
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId));
  }

  getBookmarkById({
    bookmarkId,
    userId,
  }: {
    bookmarkId: Bookmark['id'];
    userId: User['id'];
  }) {
    return this.txHost.tx.query.bookmarks.findFirst({
      where: () =>
        and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)),
    });
  }
}
