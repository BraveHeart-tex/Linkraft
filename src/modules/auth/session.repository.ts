import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { SessionInsertDto, sessions, users } from 'src/db/schema';
import { TransactionalDbAdapter } from '../database/database.types';

@Injectable()
export class SessionRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalDbAdapter>
  ) {}
  insertSession(session: SessionInsertDto) {
    return this.txHost.tx.insert(sessions).values(session);
  }

  async getSessionWithUser(sessionId: string) {
    const [row] = await this.txHost.tx
      .select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, sessionId));

    return row || null;
  }

  deleteSession(sessionId: string) {
    return this.txHost.tx.delete(sessions).where(eq(sessions.id, sessionId));
  }

  deleteAllSessionsForUser(userId: number) {
    return this.txHost.tx.delete(sessions).where(eq(sessions.userId, userId));
  }

  updateSessionExpiry(sessionId: string, newExpiry: Date) {
    return this.txHost.tx
      .update(sessions)
      .set({ expiresAt: newExpiry })
      .where(eq(sessions.id, sessionId));
  }
}
