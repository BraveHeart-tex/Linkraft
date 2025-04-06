import { Injectable } from '@nestjs/common';
import { UserInsertDto, users } from 'src/db/schema';
import { DbTransactionAdapter } from '../database/database.types';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class UserRepository {
  constructor(private txHost: TransactionHost<DbTransactionAdapter>) {}
  async insertUser(userDto: UserInsertDto) {
    const created = await this.txHost.tx
      .insert(users)
      .values(userDto)
      .returning()
      .execute();

    return created[0];
  }
}
