import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as schema from '../schema';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';

export const DRIZZLE_CONNECTION = Symbol('DRIZZLE_CONNECTION');

export type Database = NodePgDatabase<typeof schema>;

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.get('DATABASE_URL'),
        });
        return drizzle(pool, {
          schema,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE_CONNECTION],
})
export class DrizzleModule {}
