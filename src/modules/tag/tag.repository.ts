import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DbTransactionAdapter } from '../database/database.types';
import { bookmarkTags, Tag, tags, User } from 'src/db/schema';
import { and, count, eq, inArray } from 'drizzle-orm';

@Injectable()
export class TagRepository {
  constructor(private readonly txHost: TransactionHost<DbTransactionAdapter>) {}

  async bulkCreate(
    tagNames: string[],
    userId: User['id']
  ): Promise<{ id: number }[]> {
    if (tagNames.length === 0) return [];
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

  async createIfNotExists(tagNames: string[], userId: User['id']) {
    if (tagNames.length === 0) return [];

    await this.txHost.tx
      .insert(tags)
      .values(
        tagNames.map((name) => ({
          name,
          userId,
        }))
      )
      .onConflictDoNothing();

    const result = await this.txHost.tx.query.tags.findMany({
      where: () => inArray(tags.name, tagNames),
    });

    return result;
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
