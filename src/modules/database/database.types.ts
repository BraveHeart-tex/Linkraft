import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from 'src/db/schema';

export type AppDatabase = NodePgDatabase<typeof schema>;

export type DrizzleDatabaseWithPool = NodePgDatabase<typeof schema> & {
  $client: Pool;
};

export type TransactionalDbAdapter =
  TransactionalAdapterDrizzleOrm<DrizzleDatabaseWithPool>;

export interface PaginationSearchParams {
  limit: number;
  searchQuery?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: number | string | null | undefined;
}
