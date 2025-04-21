import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { bookmarkTags } from 'src/db/schema';
import { Bookmark } from '../bookmark/bookmark.types';

@Injectable()
export class BookmarkTagRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}

  addTagsToBookmark(bookmarkId: Bookmark['id'], tagIds: number[]) {
    return this.txHost.tx.insert(bookmarkTags).values(
      tagIds.map((tagId) => ({
        bookmarkId,
        tagId,
      }))
    );
  }
}
