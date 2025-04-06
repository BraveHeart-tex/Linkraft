import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import * as schema from 'src/db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export type BaseDatabase = NodePgDatabase<typeof schema> & { $client: Pool };

export type DbTransactionAdapter = TransactionalAdapterDrizzleOrm<BaseDatabase>;
