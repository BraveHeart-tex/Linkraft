import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Favicon, FaviconInsertDto, favicons } from 'src/db/schema';
import { TransactionalDbAdapter } from 'src/modules/database/database.types';

@Injectable()
export class FaviconRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalDbAdapter>
  ) {}

  async findByHash(hash: string): Promise<Favicon | undefined> {
    return this.txHost.tx
      .select()
      .from(favicons)
      .where(eq(favicons.hash, hash))
      .limit(1)
      .then((result) => result[0]);
  }

  async findByDomain(domain: string): Promise<Favicon | undefined> {
    return this.txHost.tx
      .select()
      .from(favicons)
      .where(eq(favicons.domain, domain))
      .limit(1)
      .then((result) => result[0]);
  }

  async create(data: FaviconInsertDto): Promise<Favicon> {
    return this.txHost.tx
      .insert(favicons)
      .values(data)
      .returning()
      .then((result) => result[0] as Favicon);
  }

  async update(
    faviconId: Favicon['id'],
    changes: Partial<Exclude<FaviconInsertDto, 'id'>>
  ) {
    return this.txHost.tx
      .update(favicons)
      .set(changes)
      .where(eq(favicons.id, faviconId));
  }
}
