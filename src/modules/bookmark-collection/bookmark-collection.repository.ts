import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { TransactionHost } from '@nestjs-cls/transactional';
import { bookmarkCollection, BookmarkCollectionInsertDto } from 'src/db/schema';

@Injectable()
export class BookmarkCollectionRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}

  addToCollection(values: BookmarkCollectionInsertDto) {
    return this.txHost.tx.insert(bookmarkCollection).values(values);
  }
}
