import { SQL, sql } from 'drizzle-orm';
import {
  AnyPgColumn,
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

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    title: varchar('title', { length: 255 }).notNull(),
    url: text('url').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    keywords: text('keywords[]'),
    summary: text('summary'),
    description: text('description'),
    category: varchar('category', { length: 255 }),
    thumbnail: varchar('thumbnail', { length: 255 }),
    notes: text('notes'),
    isDeleted: boolean('is_deleted').default(false),
    isPublic: boolean('is_public').default(true),
  },
  (table) => [
    index('bookmark_search_index').using(
      'gin',
      sql`to_tsvector('english', ${table.title} || ' ' || ${table.summary} || ' ' || ${table.description})`
    ),
  ]
);

export const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 16 }),
  createdAt: timestamp('created_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
});

export const bookmarkCollection = pgTable(
  'bookmark_collection',
  {
    bookmarkId: integer('bookmark_id')
      .notNull()
      .references(() => bookmarks.id),
    collectionId: integer('collection_id')
      .notNull()
      .references(() => collections.id),
  },
  (table) => [
    primaryKey({
      name: 'bookmark_collection_id',
      columns: [table.bookmarkId, table.collectionId],
    }),
  ]
);

export const accessControls = pgTable('access_controls', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull(),
  resourceType: varchar('resource_type', { length: 255 }).notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  permissionType: varchar('permission_type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UserWithoutPasswordHash = Omit<User, 'passwordHash'>;
export type Session = typeof sessions.$inferSelect;
export type SessionInsertDto = typeof sessions.$inferInsert;

export type UserInsertDto = typeof users.$inferInsert;

export const lower = (email: AnyPgColumn): SQL => {
  return sql`lower(${email})`;
};
