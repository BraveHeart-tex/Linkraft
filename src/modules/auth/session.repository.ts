import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  type Session,
  type SessionInsertDto,
  sessions,
  User,
  users,
} from 'src/db/schema';
import { TransactionalDbAdapter } from '../database/database.types';

@Injectable()
export class SessionRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalDbAdapter>
  ) {}
  insertSession(session: SessionInsertDto) {
    return this.txHost.tx.insert(sessions).values(session);
  }

  async getSessionWithUser(sessionId: Session['id']) {
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

  deleteSession(sessionId: Session['id']) {
    return this.txHost.tx.delete(sessions).where(eq(sessions.id, sessionId));
  }

  deleteAllSessionsForUser(userId: User['id']) {
    return this.txHost.tx.delete(sessions).where(eq(sessions.userId, userId));
  }

  updateSessionExpiry(sessionId: Session['id'], newExpiry: Date) {
    return this.txHost.tx
      .update(sessions)
      .set({ expiresAt: newExpiry })
      .where(eq(sessions.id, sessionId));
  }
}
