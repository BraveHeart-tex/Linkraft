import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { TransactionHost } from '@nestjs-cls/transactional';
import { CollectionInsertDto, collections } from 'src/db/schema';

@Injectable()
export class CollectionRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}
  async createCollection(data: CollectionInsertDto) {
    const insertedCollection = await this.txHost.tx
      .insert(collections)
      .values(data)
      .returning()
      .execute();
    return insertedCollection[0];
  }
}
