import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/modules/database/database.constants';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import {
  BookmarkInsertDto,
  bookmarks,
  bookmarkTags,
  collections,
  Tag,
  tags,
  User,
} from 'src/db/schema';
import {
  PaginatedResult,
  TransactionalDbAdapter,
} from '../database/database.types';
import {
  Bookmark,
  BookmarkOwnershipParams,
  BookmarkWithTagsAndCollection,
  FindUserBookmarksParams,
  UpdateBookmarkParams,
} from './bookmark.types';

@Injectable()
export class BookmarkRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalDbAdapter>
  ) {}

  // TODO: Test narrow first, join second method
  async findAllByUserId({
    userId,
    limit = DEFAULT_PAGE_SIZE,
    cursor,
    searchQuery = '',
    trashed = false,
    collectionId,
  }: FindUserBookmarksParams): Promise<
    PaginatedResult<BookmarkWithTagsAndCollection>
  > {
    limit = Math.min(limit, MAX_PAGE_SIZE);

    const query = this.txHost.tx
      .select({
        bookmark: bookmarks,
        tags: sql<Pick<Tag, 'id' | 'name'>[]>`COALESCE(
        json_agg(json_build_object('id', ${tags.id}, 'name', ${tags.name}))
        FILTER (WHERE ${tags.id} IS NOT NULL),
        '[]'
      )`.as('tags'),
        collection: {
          id: collections.id,
          name: collections.name,
        },
      })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          trashed
            ? isNotNull(bookmarks.deletedAt)
            : isNull(bookmarks.deletedAt),
          collectionId ? eq(bookmarks.collectionId, collectionId) : undefined,
          searchQuery
            ? or(
                ilike(bookmarks.title, `%${searchQuery}%`),
                ilike(bookmarks.description, `%${searchQuery}%`)
              )
            : undefined,
          cursor
            ? or(
                lt(bookmarks.createdAt, cursor.createdAt),
                and(
                  eq(bookmarks.createdAt, cursor.createdAt),
                  lt(bookmarks.id, cursor.id)
                )
              )
            : undefined
        )
      )
      .leftJoin(bookmarkTags, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .leftJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .leftJoin(collections, eq(bookmarks.collectionId, collections.id))
      .groupBy(bookmarks.id, collections.id)
      .orderBy(desc(bookmarks.createdAt))
      .$dynamic();

    query.limit(limit);

    const result = await query.execute();

    const items = result.map((row) => ({
      ...row.bookmark,
      tags: row.tags || [],
      collection: row.collection,
    }));

    const lastItem = items.length === limit ? items[items.length - 1] : null;

    return {
      items,
      nextCursor: Buffer.from(
        JSON.stringify(
          lastItem
            ? {
                createdAt: lastItem.createdAt,
                id: lastItem.id,
              }
            : null
        )
      ).toString('base64'),
    };
  }

  findByIdAndUserId({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.txHost.tx.query.bookmarks.findFirst({
      where: () =>
        and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)),
    });
  }

  async findBookmarkWithDetailsByUserId({
    bookmarkId,
    userId,
  }: BookmarkOwnershipParams): Promise<BookmarkWithTagsAndCollection | null> {
    const query = this.txHost.tx
      .select({
        bookmark: bookmarks,
        tags: sql<Pick<Tag, 'id' | 'name'>[]>`COALESCE(
          json_agg(json_build_object('id', ${tags.id}, 'name', ${tags.name}))
          FILTER (WHERE ${tags.id} IS NOT NULL),
          '[]'
        )`.as('tags'),
        collection: {
          id: collections.id,
          name: collections.name,
        },
      })
      .from(bookmarks)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)))
      .leftJoin(bookmarkTags, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .leftJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .leftJoin(collections, eq(bookmarks.collectionId, collections.id))
      .groupBy(bookmarks.id, collections.id)
      .limit(1)
      .$dynamic();

    const [row] = await query.execute();

    if (!row) return null;

    return {
      ...row.bookmark,
      tags: row.tags || [],
      collection: row.collection,
    };
  }

  async findWithTagsAndCollectionByIdAndUserId({
    bookmarkId,
    userId,
  }: BookmarkOwnershipParams): Promise<
    BookmarkWithTagsAndCollection | undefined
  > {
    const result = await this.txHost.tx
      .select({
        bookmark: bookmarks,
        tags: sql<Pick<Tag, 'id' | 'name'>[]>`COALESCE(
          json_agg(json_build_object('id', ${tags.id}, 'name', ${tags.name}))
          FILTER (WHERE ${tags.id} IS NOT NULL),
          '[]'
        )`.as('tags'),
        collection: {
          id: collections.id,
          name: collections.name,
        },
      })
      .from(bookmarks)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)))
      .leftJoin(bookmarkTags, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .leftJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .leftJoin(collections, eq(bookmarks.collectionId, collections.id))
      .limit(1)
      .groupBy(bookmarks.id, collections.id);

    if (!result[0]) return;

    return {
      ...result[0].bookmark,
      collection: result[0].collection,
      tags: result[0].tags,
    };
  }

  async userHasBookmarkWithUrl({
    url,
    userId,
  }: {
    url: string;
    userId: User['id'];
  }) {
    const result = await this.txHost.tx
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.url, url)));

    return result[0];
  }

  async create(data: BookmarkInsertDto) {
    const result = await this.txHost.tx
      .insert(bookmarks)
      .values(data)
      .returning();
    return result[0] as Bookmark;
  }

  async bulkCreate(data: BookmarkInsertDto[]) {
    return await this.txHost.tx
      .insert(bookmarks)
      .values(data)
      .returning({ id: bookmarks.id });
  }

  updateByIdAndUserId({ bookmarkId, updates, userId }: UpdateBookmarkParams) {
    if (Object.keys(updates || {}).length === 0) return;
    return this.txHost.tx
      .update(bookmarks)
      .set(updates)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
  }

  softDeleteByIdAndUserId({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.txHost.tx
      .update(bookmarks)
      .set({
        deletedAt: sql`NOW()`,
      })
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.id, bookmarkId)));
  }

  deleteByIdAndUserId({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.txHost.tx
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.id, bookmarkId)));
  }

  bulkSoftDeleteByIdsAndUserId(
    bookmarkIds: Bookmark['id'][],
    userId: User['id']
  ) {
    return this.txHost.tx
      .update(bookmarks)
      .set({
        deletedAt: sql`NOW()`,
      })
      .where(
        and(eq(bookmarks.userId, userId), inArray(bookmarks.id, bookmarkIds))
      )
      .returning({
        deleteId: bookmarks.id,
      });
  }

  async findByUserIdAndUrlExcludingBookmark({
    userId,
    url,
    excludeBookmarkId,
  }: {
    userId: User['id'];
    url: string;
    excludeBookmarkId: Bookmark['id'];
  }) {
    return this.txHost.tx.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.url, url),
        ne(bookmarks.id, excludeBookmarkId)
      ),
    });
  }

  async bulkDeleteTrashedUserBookmarks(userId: User['id']) {
    return this.txHost.tx
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNotNull(bookmarks.deletedAt)))
      .returning({
        id: bookmarks.id,
      });
  }

  bulkDelete(userId: User['id'], bookmarkIds: Bookmark['id'][]) {
    return this.txHost.tx
      .delete(bookmarks)
      .where(
        and(eq(bookmarks.userId, userId), inArray(bookmarks.id, bookmarkIds))
      )
      .returning({
        id: bookmarks.id,
      });
  }
}
