import { Injectable } from '@nestjs/common';
import { User, UserInsertDto, users } from 'src/db/schema';
import { lower } from 'src/db/drizzle.utils';
import { DbTransactionAdapter } from '../database/database.types';
import { TransactionHost } from '@nestjs-cls/transactional';
import { eq } from 'drizzle-orm';

@Injectable()
export class UserRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}
  async create(userDto: UserInsertDto): Promise<User> {
    const created = await this.txHost.tx
      .insert(users)
      .values(userDto)
      .returning()
      .execute();

    return created[0] as User;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.txHost.tx.query.users.findFirst({
      where: eq(lower(users.email), email.toLowerCase()),
    });
  }
}
