import { Inject, Injectable } from '@nestjs/common';
import { Database, DRIZZLE_CONNECTION } from './modules/drizzle.module';
import { users } from './db/schema';

@Injectable()
export class AppService {
  constructor(@Inject(DRIZZLE_CONNECTION) private db: Database) {}
  async getHello() {
    return await this.db.select().from(users);
  }
}
