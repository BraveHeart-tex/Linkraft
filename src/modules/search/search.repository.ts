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
          ts_rank(to_tsvector('simple', b.title || ' ' || coalesce(b.description, '')), sq.query) AS rank
        FROM bookmarks b, search_query sq
        WHERE b.user_id = ${userId}
          AND b.deleted_at IS NULL
          AND to_tsvector('simple', b.title || ' ' || coalesce(b.description, '')) @@ sq.query
  
        UNION ALL
  
        SELECT 
          t.id::text AS id,
          'tag' AS type,
          t.name AS title,
          NULL AS description,
          ts_rank(to_tsvector('simple', t.name), sq.query) AS rank
        FROM tags t, search_query sq
        WHERE t.user_id = ${userId}
          AND to_tsvector('simple', t.name) @@ sq.query
  
        UNION ALL
  
        SELECT 
          c.id::text AS id,
          'collection' AS type,
          c.name AS title,
          c.description,
          ts_rank(to_tsvector('simple', c.name || ' ' || coalesce(c.description, '')), sq.query) AS rank
        FROM collections c, search_query sq
        WHERE c.user_id = ${userId}
          AND c.is_deleted = false
          AND to_tsvector('simple', c.name || ' ' || coalesce(c.description, '')) @@ sq.query
      ),
      fuzzy_results AS (
        SELECT 
          b.id::text AS id,
          'bookmark' AS type,
          b.title,
          b.description,
          similarity(b.title, ${query}) AS rank
        FROM bookmarks b
        WHERE b.user_id = ${userId}
          AND b.deleted_at IS NULL
          AND b.title % ${query}
  
        UNION ALL
  
        SELECT 
          t.id::text AS id,
          'tag' AS type,
          t.name AS title,
          NULL AS description,
          similarity(t.name, ${query}) AS rank
        FROM tags t
        WHERE t.user_id = ${userId}
          AND t.name % ${query}
  
        UNION ALL
  
        SELECT 
          c.id::text AS id,
          'collection' AS type,
          c.name AS title,
          c.description,
          similarity(c.name, ${query}) AS rank
        FROM collections c
        WHERE c.user_id = ${userId}
          AND c.is_deleted = false
          AND c.name % ${query}
      ),
      all_results AS (
        SELECT * FROM fts_results
        UNION
        SELECT * FROM fuzzy_results
      )
      SELECT DISTINCT ON (id, type) *
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
      ORDER BY id, type, rank DESC
      LIMIT ${limit};
    `
      : sql`
      WITH all_results AS (
        SELECT 
          b.id::text AS id,
          'bookmark' AS type,
          b.title,
          b.description,
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
          c.description,
          NULL::float AS rank
        FROM collections c
        WHERE c.user_id = ${userId}
          AND c.is_deleted = false
      )
      SELECT DISTINCT ON (id, type) *
      FROM all_results
      WHERE ${hasCursorId ? sql`id > ${cursorId}` : sql`TRUE`}
      ORDER BY id, type, rank DESC
      LIMIT ${limit};
    `;

    return this.txHost.tx.execute(rawSearchSql);
  }
}
