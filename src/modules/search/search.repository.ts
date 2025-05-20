import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { TransactionalDbAdapter } from 'src/modules/database/database.types';
import { SearchAllParams } from 'src/modules/search/search.types';

@Injectable()
export class SearchRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalDbAdapter>
  ) {}

  async searchAll({
    query = '',
    userId,
    cursorRank,
    cursorId,
    limit = 20,
  }: SearchAllParams) {
    const hasQuery = query.trim().length > 0;
    const hasCursorRank = cursorRank !== null && cursorRank !== undefined;
    const hasCursorId = cursorId !== null && cursorId !== undefined;

    const rawSearchSql = hasQuery
      ? sql`
    WITH 
    search_query AS (
      SELECT to_tsquery('simple', ${query + ':*'}) AS query
    ),
    fts_results AS (
      SELECT 
        b.id::text AS id,
        'bookmark' AS type,
        b.title,
        b.description,
        b.url,
        ts_rank(to_tsvector('simple', b.title || ' ' || coalesce(b.description, '')), sq.query) AS rank
      FROM bookmarks b, search_query sq
      WHERE b.user_id = ${userId}
        AND b.deleted_at IS NULL
        AND to_tsvector('simple', b.title || ' ' || coalesce(b.description, '')) @@ sq.query
    ),
    fuzzy_results AS (
      SELECT 
        b.id::text AS id,
        'bookmark' AS type,
        b.title,
        b.description,
        b.url,
        similarity(b.title, ${query}) AS rank
      FROM bookmarks b
      WHERE b.user_id = ${userId}
        AND b.deleted_at IS NULL
        AND b.title % ${query}
    ),
    all_results AS (
      SELECT * FROM fts_results
      UNION ALL
      SELECT * FROM fuzzy_results
    )
    SELECT DISTINCT ON (id) *
    FROM all_results
    WHERE 
      ${
        hasCursorRank && hasCursorId
          ? sql`(COALESCE(rank, 0) < ${cursorRank} OR (COALESCE(rank, 0) = ${cursorRank} AND id > ${cursorId}))`
          : hasCursorRank
            ? sql`COALESCE(rank, 0) < ${cursorRank}`
            : hasCursorId
              ? sql`id > ${cursorId}`
              : sql`TRUE`
      }
    ORDER BY id, COALESCE(rank, 0) DESC
    LIMIT ${limit};
    `
      : sql`
    SELECT DISTINCT ON (b.id::text) 
      b.id::text AS id,
      'bookmark' AS type,
      b.title,
      b.description,
      b.url,
      NULL::float AS rank
    FROM bookmarks b
    WHERE b.user_id = ${userId}
      AND b.deleted_at IS NULL
      ${hasCursorId ? sql`AND b.id::text > ${cursorId}` : sql``}
    ORDER BY b.id::text, rank DESC
    LIMIT ${limit};
    `;

    return this.txHost.tx.execute(rawSearchSql);
  }
}
