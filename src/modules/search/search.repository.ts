import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbTransactionAdapter } from 'src/modules/database/database.types';
import { SearchAllParams } from 'src/modules/search/search.types';

@Injectable()
export class SearchRepository {
  constructor(private readonly txHost: TransactionHost<DbTransactionAdapter>) {}

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
        WITH search_query AS (
          SELECT pg_catalog.plainto_tsquery('english', ${query}) AS query
        ),
        all_results AS (
          SELECT 
            b.id::text AS id,
            'bookmark' AS type,
            b.title AS title,
            b.description AS description,
            ts_rank(b.tsv, sq.query) AS rank
          FROM bookmarks b, search_query sq
          WHERE b.user_id = ${userId}
            AND b.deleted_at IS NULL
            AND b.tsv @@ sq.query
  
          UNION ALL
  
          SELECT 
            t.id::text AS id,
            'tag' AS type,
            t.name AS title,
            NULL AS description,
            ts_rank(t.tsv, sq.query) AS rank
          FROM tags t, search_query sq
          WHERE t.user_id = ${userId}
            AND t.tsv @@ sq.query
  
          UNION ALL
  
          SELECT 
            c.id::text AS id,
            'collection' AS type,
            c.name AS title,
            c.description AS description,
            ts_rank(c.tsv, sq.query) AS rank
          FROM collections c, search_query sq
          WHERE c.user_id = ${userId}
            AND c.is_deleted = false
            AND c.tsv @@ sq.query
        )
        SELECT *
        FROM all_results
        WHERE 
          ${
            hasCursorRank && hasCursorId
              ? sql`(rank < ${cursorRank} OR (rank = ${cursorRank} AND id > ${cursorId}))`
              : hasCursorRank
                ? sql`rank < ${cursorRank}`
                : hasCursorId
                  ? sql`id > ${cursorId}`
                  : sql`TRUE`
          }
        ORDER BY rank DESC, id ASC
        LIMIT ${limit}
      `
      : sql`
        WITH all_results AS (
          SELECT 
            b.id::text AS id,
            'bookmark' AS type,
            b.title AS title,
            b.description AS description,
            NULL::float AS rank
          FROM bookmarks b
          WHERE b.user_id = ${userId}
            AND b.deleted_at IS NULL
  
          UNION ALL
  
          SELECT 
            t.id::text AS id,
            'tag' AS type,
            t.name AS title,
            NULL AS description,
            NULL::float AS rank
          FROM tags t
          WHERE t.user_id = ${userId}
  
          UNION ALL
  
          SELECT 
            c.id::text AS id,
            'collection' AS type,
            c.name AS title,
            c.description AS description,
            NULL::float AS rank
          FROM collections c
          WHERE c.user_id = ${userId}
            AND c.is_deleted = false
        )
        SELECT *
        FROM all_results
        WHERE 
          ${hasCursorId ? sql`id > ${cursorId}` : sql`TRUE`}
        ORDER BY id ASC
        LIMIT ${limit}
      `;

    return this.txHost.tx.execute(rawSearchSql);
  }
}
