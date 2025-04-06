import { Inject, Injectable } from '@nestjs/common';
import { Database, DRIZZLE_CONNECTION } from './drizzle/drizzle.module';
import { users } from './schema';

@Injectable()
export class AppService {
  constructor(@Inject(DRIZZLE_CONNECTION) private db: Database) {}
  async getHello() {
    return await this.db.select().from(users);
  }
}
