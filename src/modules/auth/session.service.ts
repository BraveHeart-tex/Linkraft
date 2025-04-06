import { Injectable } from '@nestjs/common';
import { SessionRepository } from './session.repository';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { SessionValidationResult } from './session.types';
import { TextEncoder } from 'util';

@Injectable()
export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  private getSessionId(token: string): string {
    const encoded = new TextEncoder().encode(token);
    return encodeHexLowerCase(sha256(encoded));
  }

  async createSession(token: string, userId: number) {
    const sessionId = this.getSessionId(token);
    const session = {
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };
    await this.repo.insertSession(session);
    return session;
  }

  async validateSessionToken(token: string): Promise<SessionValidationResult> {
    const sessionId = this.getSessionId(token);
    const result = await this.repo.getSessionWithUser(sessionId);

    if (!result) return { session: null, user: null };

    const { session, user } = result;

    if (Date.now() >= session.expiresAt.getTime()) {
      await this.repo.deleteSession(session.id);
      return { session: null, user: null };
    }

    const halfLife = 1000 * 60 * 60 * 24 * 15;
    if (Date.now() >= session.expiresAt.getTime() - halfLife) {
      session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      await this.repo.updateSessionExpiry(session.id, session.expiresAt);
    }

    return { session, user };
  }

  async invalidateSession(sessionId: string) {
    await this.repo.deleteSession(sessionId);
  }

  async invalidateAllSessions(userId: number) {
    await this.repo.deleteAllSessionsForUser(userId);
  }
}
