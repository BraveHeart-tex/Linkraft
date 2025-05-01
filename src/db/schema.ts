import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const MAX_BOOKMARK_TITLE_LENGTH = 255;
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    visibleName: varchar('visibleName', { length: 255 }).notNull(),
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
    userId: integer('user_id')
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
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 64 }).notNull(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
  },
  (table) => [uniqueIndex('unique_tag_per_user').on(table.userId, table.name)]
);

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),
    url: text('url').notNull(),
    title: varchar('title', { length: MAX_BOOKMARK_TITLE_LENGTH }).notNull(),
    description: text('description'),
    faviconUrl: varchar('faviconUrl', { length: 255 }).default(sql`null`),
    createdAt: timestamp('created_at').defaultNow(),
    collectionId: integer('collection_id').references(() => collections.id, {
      onDelete: 'cascade',
    }),
    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
      mode: 'date',
    }).default(sql`null`),
    isMetadataPending: boolean('is_metadata_pending').notNull(),
  },
  (table) => [
    index('bookmark_search_index').using(
      'gin',
      sql`to_tsvector('english', ${table.title} || ' ' || ${table.description})`
    ),
    index('bookmark_user_id_index').on(table.userId),
  ]
);

export const bookmarkTags = pgTable(
  'bookmark_tags',
  {
    bookmarkId: integer('bookmark_id')
      .notNull()
      .references(() => bookmarks.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.bookmarkId, table.tagId] })]
);

export const collections = pgTable(
  'collections',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 16 }),
    createdAt: timestamp('created_at').defaultNow(),
    isDeleted: boolean('is_deleted').default(false),
  },
  (table) => [index('collection_user_id_index').on(table.userId)]
);

export type User = typeof users.$inferSelect;
export type UserWithoutPasswordHash = Omit<User, 'passwordHash'>;
export type Session = typeof sessions.$inferSelect;
export type SessionInsertDto = typeof sessions.$inferInsert;

export type UserInsertDto = typeof users.$inferInsert;

export type CollectionInsertDto = typeof collections.$inferInsert;
export type Collection = typeof collections.$inferSelect;

export type BookmarkInsertDto = typeof bookmarks.$inferInsert;

export type Tag = typeof tags.$inferSelect;
