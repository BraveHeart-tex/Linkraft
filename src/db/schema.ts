import { MAX_BOOKMARK_TITLE_LENGTH } from '@/modules/bookmark/bookmark.constants';
import { relations, sql } from 'drizzle-orm';
import {
  AnyPgColumn,
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { tsvector } from 'src/db/drizzle.utils';

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    visibleName: varchar('visible_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    isActive: boolean('is_active').default(true),
    profilePicture: varchar('profile_picture', { length: 255 }),
  },
  (table) => [uniqueIndex('emailUniqueIndex').on(table.email)]
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => [index('session_user_id_index').on(table.userId)]
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 64 }).notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    tsv: tsvector('tsv'),
  },
  (table) => [
    uniqueIndex('unique_tag_per_user').on(table.userId, table.name),
    index('tags_tsv_index').using('gin', table.tsv),
  ]
);

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),
    url: text('url').notNull(),
    title: varchar('title', { length: MAX_BOOKMARK_TITLE_LENGTH }).notNull(),
    description: text('description'),
    faviconUrl: varchar('favicon_url', { length: 255 }).default(sql`null`),
    createdAt: timestamp('created_at').defaultNow(),
    collectionId: uuid('collection_id').references(() => collections.id, {
      onDelete: 'cascade',
    }),
    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
      mode: 'date',
    }).default(sql`null`),
    isMetadataPending: boolean('is_metadata_pending').notNull(),
    tsv: tsvector('tsv'),
  },
  (table) => [
    index('bookmarks_tsv_index').using('gin', table.tsv),
    index('bookmark_user_id_index').on(table.userId),
    index('bookmark_collection_id_index').on(table.collectionId),
    index('bookmark_deleted_at_index').on(table.deletedAt),
  ]
);

export const bookmarkTags = pgTable(
  'bookmark_tags',
  {
    bookmarkId: uuid('bookmark_id')
      .notNull()
      .references(() => bookmarks.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.bookmarkId, table.tagId] })]
);

export const collections = pgTable(
  'collections',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 255 }).notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => collections.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    tsv: tsvector('tsv'),
  },
  (table) => [
    index('collection_user_id_index').on(table.userId),
    index('collections_tsv_index').using('gin', table.tsv),
  ]
);

export const favicons = pgTable(
  'favicons',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    url: text('url').notNull(),
    hash: varchar('hash', { length: 64 }).notNull().unique(),
    r2Key: text('r2_key').notNull(),
    domain: varchar('domain', { length: 253 }).notNull().unique(),
    createdAt: timestamp('created_at', { mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex('favicons_unique_hash_index').on(table.hash),
    uniqueIndex('favicons_unique_domain_index').on(table.domain),
  ]
);

export const bookmarkRelations = relations(bookmarks, ({ one, many }) => ({
  collection: one(collections, {
    fields: [bookmarks.collectionId],
    references: [collections.id],
  }),
  bookmarkTags: many(bookmarkTags),
}));

export const collectionRelations = relations(collections, ({ many }) => ({
  bookmarks: many(bookmarks),
}));

export const bookmarkTagRelations = relations(bookmarkTags, ({ one }) => ({
  tag: one(tags, {
    fields: [bookmarkTags.tagId],
    references: [tags.id],
  }),
  bookmark: one(bookmarks, {
    fields: [bookmarkTags.bookmarkId],
    references: [bookmarks.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type UserWithoutPasswordHash = Omit<User, 'passwordHash'>;
export type Session = typeof sessions.$inferSelect;
export type SessionInsertDto = typeof sessions.$inferInsert;

export type UserInsertDto = typeof users.$inferInsert;

export type CollectionInsertDto = typeof collections.$inferInsert;
export type Collection = typeof collections.$inferSelect;

export type BookmarkInsertDto = typeof bookmarks.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type SlimTag = Pick<Tag, 'id' | 'name'>;
export type BookmarkTag = typeof bookmarkTags.$inferSelect;

export type Favicon = typeof favicons.$inferSelect;
export type FaviconInsertDto = typeof favicons.$inferInsert;
