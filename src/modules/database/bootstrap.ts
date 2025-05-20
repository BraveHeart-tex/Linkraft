import { DrizzleConfig } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from '../../db/schema';

export const createPgPool = (config: PoolConfig): Pool => {
  return new Pool(config);
};

export const createDb = (
  pool: Pool,
  config?: Omit<DrizzleConfig<typeof schema>, 'schema'>
): NodePgDatabase<typeof schema> => {
  return drizzle(pool, {
    ...config,
    schema,
  });
};
