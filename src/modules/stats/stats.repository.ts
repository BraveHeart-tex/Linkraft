import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { bookmarks, collections, tags, User } from 'src/db/schema';
import { DbTransactionAdapter } from 'src/modules/database/database.types';
import { GeneralStats } from 'src/modules/stats/stats.types';

@Injectable()
export class StatsRepository {
  constructor(private readonly txHost: TransactionHost<DbTransactionAdapter>) {}

  async getGeneralStatsForUser(userId: User['id']): Promise<GeneralStats> {
    const result = await this.txHost.tx.execute<{
      bookmarkCount: number;
      collectionCount: number;
      tagCount: number;
    }>(sql`
      SELECT
        (SELECT COUNT(*) FROM ${bookmarks} WHERE ${bookmarks.userId} = ${userId} AND ${bookmarks.deletedAt} IS NULL) AS "bookmarkCount",
        (SELECT COUNT(*) FROM ${collections} WHERE ${collections.userId} = ${userId} AND ${collections.isDeleted} = false) AS "collectionCount",
        (SELECT COUNT(*) FROM ${tags} WHERE ${tags.userId} = ${userId}) AS "tagCount"
    `);

    return result.rows[0]!;
  }
}
