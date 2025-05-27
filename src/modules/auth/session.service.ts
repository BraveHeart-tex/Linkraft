import type { Session, User } from '@/db/schema';
import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { SESSION_HALF_LIFE_MS, SESSION_LIFETIME_MS } from './auth.constants';
import { SessionRepository } from './session.repository';
import { SessionValidationResult } from './session.types';
import { getSessionId } from './utils/token.utils';

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async createUserSession(token: string, userId: User['id']) {
    const sessionId = getSessionId(token);
    const session = {
      id: sessionId,
      userId,
      expiresAt: DateTime.utc()
        .plus({ milliseconds: SESSION_LIFETIME_MS })
        .toISO(),
    };
    await this.sessionRepository.insertSession(session);
    return session;
  }

  @Transactional()
  async validateSessionCommon(
    token: string,
    shouldRefresh: boolean = false
  ): Promise<SessionValidationResult> {
    const sessionId = getSessionId(token);
    const result = await this.sessionRepository.getSessionWithUser(sessionId);

    if (!result) return { session: null, user: null };

    const { session, user } = result;
    const now = DateTime.utc();
    const expiresAt = DateTime.fromISO(session.expiresAt, { zone: 'utc' });

    if (now >= expiresAt) {
      await this.sessionRepository.deleteSession(session.id);
      return { session: null, user: null };
    }

    if (
      shouldRefresh &&
      now >= expiresAt.minus({ milliseconds: SESSION_HALF_LIFE_MS })
    ) {
      const newExpiry = now.plus({ milliseconds: SESSION_LIFETIME_MS });
      session.expiresAt = newExpiry.toISO();
      await this.sessionRepository.updateSessionExpiry(
        session.id,
        session.expiresAt
      );
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
    await this.sessionRepository.deleteSession(sessionId);
  }

  async invalidateAllSessions(userId: User['id']) {
    await this.sessionRepository.deleteAllSessionsForUser(userId);
  }
}
