import type { Session, User } from '@/db/schema';
import { SessionPolicy } from '@/modules/auth/session.policy';
import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { SessionRepository } from './session.repository';
import { SessionValidationResult } from './session.types';
import { getSessionId } from './utils/token.utils';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionPolicy: SessionPolicy,
    private readonly sessionRepository: SessionRepository
  ) {}

  async createUserSession(token: string, userId: User['id']) {
    const sessionId = getSessionId(token);
    const session = {
      id: sessionId,
      userId,
      expiresAt: this.sessionPolicy.getNewExpiry(),
    };
    await this.sessionRepository.insertSession(session);
    return session;
  }

  @Transactional()
  async validateSession(token: string): Promise<SessionValidationResult> {
    const sessionId = getSessionId(token);
    const result = await this.sessionRepository.getSessionWithUser(sessionId);

    if (!result) return { session: null, user: null };

    const { session, user } = result;

    if (this.sessionPolicy.isExpired(session.expiresAt)) {
      await this.sessionRepository.deleteSession(session.id);
      return { session: null, user: null };
    }

    if (this.sessionPolicy.shouldRefresh(session.expiresAt)) {
      session.expiresAt = this.sessionPolicy.getNewExpiry();
      await this.sessionRepository.updateSessionExpiry(
        session.id,
        session.expiresAt
      );
    }

    return { session, user };
  }

  async invalidateSession(sessionId: Session['id']) {
    await this.sessionRepository.deleteSession(sessionId);
  }

  async invalidateAllSessions(userId: User['id']) {
    await this.sessionRepository.deleteAllSessionsForUser(userId);
  }
}
