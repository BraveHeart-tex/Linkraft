import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { lower } from 'src/db/drizzle.utils';
import { User, UserInsertDto, users } from 'src/db/schema';
import { TransactionalDbAdapter } from '../database/database.types';

@Injectable()
export class UserRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalDbAdapter>
  ) {}
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
