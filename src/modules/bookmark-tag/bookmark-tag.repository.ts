import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { bookmarkTags, Tag } from 'src/db/schema';
import { Bookmark } from '../bookmark/bookmark.types';
import { and, eq, inArray } from 'drizzle-orm';

@Injectable()
export class BookmarkTagRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}

  addTagsToBookmark(bookmarkId: Bookmark['id'], tagIds: Tag['id'][]) {
    if (tagIds.length === 0) return [];
    return this.txHost.tx
      .insert(bookmarkTags)
      .values(
        tagIds.map((tagId) => ({
          bookmarkId,
          tagId,
        }))
      )
      .returning();
  }

  removeTagsFromBookmark(bookmarkId: Bookmark['id'], tagIds: Tag['id'][]) {
    if (tagIds.length === 0) return;
    return this.txHost.tx
      .delete(bookmarkTags)
      .where(
        and(
          eq(bookmarkTags.bookmarkId, bookmarkId),
          inArray(bookmarkTags.tagId, tagIds)
        )
      );
  }

  findByBookmarkId(bookmarkId: Bookmark['id']) {
    return this.txHost.tx.query.bookmarkTags.findMany({
      where: () => eq(bookmarkTags.bookmarkId, bookmarkId),
    });
  }
}
