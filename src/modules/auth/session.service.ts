import type { Session, User } from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { SESSION_HALF_LIFE_MS, SESSION_LIFETIME_MS } from './auth.constants';
import { SessionRepository } from './session.repository';
import { SessionValidationResult } from './session.types';
import { getSessionId } from './utils/token.utils';

@Injectable()
export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  async createUserSession(token: string, userId: User['id']) {
    const sessionId = getSessionId(token);
    const session = {
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    };
    await this.repo.insertSession(session);
    return session;
  }

  async validateSessionCommon(
    token: string,
    shouldRefresh: boolean = false
  ): Promise<SessionValidationResult> {
    const sessionId = getSessionId(token);
    const result = await this.repo.getSessionWithUser(sessionId);

    if (!result) return { session: null, user: null };

    const { session, user } = result;

    if (Date.now() >= session.expiresAt.getTime()) {
      await this.repo.deleteSession(session.id);
      return { session: null, user: null };
    }

    if (
      shouldRefresh &&
      Date.now() >= session.expiresAt.getTime() - SESSION_HALF_LIFE_MS
    ) {
      session.expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
      await this.repo.updateSessionExpiry(session.id, session.expiresAt);
    }

    return { session, user };
  }

  async validateSession(token: string): Promise<SessionValidationResult> {
    return this.validateSessionCommon(token, false);
  }

  async validateAndRefreshSession(
    token: string
  ): Promise<SessionValidationResult> {
    return this.validateSessionCommon(token, true);
  }

  async invalidateSession(sessionId: Session['id']) {
    await this.repo.deleteSession(sessionId);
  }

  async invalidateAllSessions(userId: User['id']) {
    await this.repo.deleteAllSessionsForUser(userId);
  }
}
