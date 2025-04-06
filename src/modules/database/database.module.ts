import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';

export const DRIZZLE_CONNECTION = Symbol('DRIZZLE_CONNECTION');

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.get<string>('DATABASE_URL'),
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
export class DatabaseModule {}
