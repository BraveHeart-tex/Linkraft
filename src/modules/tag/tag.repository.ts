import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { tags, User } from 'src/db/schema';

@Injectable()
export class TagRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}

  bulkCreate(
    tagNames: string[],
    userId: User['id']
  ): Promise<{ id: number }[]> {
    return this.txHost.tx
      .insert(tags)
      .values(
        tagNames.map((tagName) => ({
          name: tagName,
          userId,
        }))
      )
      .returning({
        id: tags.id,
      });
  }
}
