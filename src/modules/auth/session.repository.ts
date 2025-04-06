import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, DRIZZLE_CONNECTION } from '../drizzle.module';
import { sessions, users } from 'src/db/schema';

@Injectable()
export class SessionRepository {
  constructor(@Inject(DRIZZLE_CONNECTION) private db: Database) {}
  insertSession(session: { id: string; userId: number; expiresAt: Date }) {
    return this.db.insert(sessions).values(session);
  }

  async getSessionWithUser(sessionId: string) {
    const [row] = await this.db
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
    return this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  deleteAllSessionsForUser(userId: number) {
    return this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  updateSessionExpiry(sessionId: string, newExpiry: Date) {
    return this.db
      .update(sessions)
      .set({ expiresAt: newExpiry })
      .where(eq(sessions.id, sessionId));
  }
}
