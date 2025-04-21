import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { bookmarkTags, Tag, tags, User } from 'src/db/schema';
import { and, count, eq } from 'drizzle-orm';

@Injectable()
export class TagRepository {
  constructor(private readonly txHost: TransactionHost<DbTransactionAdapter>) {}

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

  async getUserTags(
    userId: User['id']
  ): Promise<(Tag & { usageCount: number })[]> {
    const rows = await this.txHost.tx
      .select({
        tag: tags,
        usageCount: count(bookmarkTags.bookmarkId),
      })
      .from(tags)
      .leftJoin(bookmarkTags, eq(bookmarkTags.tagId, tags.id))
      .where(and(eq(tags.userId, userId)))
      .groupBy(tags.id);

    return rows.map((row) => ({
      ...row.tag,
      usageCount: row.usageCount,
    }));
  }
}
