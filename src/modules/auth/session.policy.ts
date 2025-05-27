import {
  SESSION_HALF_LIFE_MS,
  SESSION_LIFETIME_MS,
} from '@/modules/auth/auth.constants';
import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

@Injectable()
export class SessionPolicy {
  isExpired(expiresAtISO: string): boolean {
    const now = DateTime.utc();
    const expiresAt = DateTime.fromISO(expiresAtISO, { zone: 'utc' });
    return now >= expiresAt;
  }

  shouldRefresh(expiresAtISO: string, now = DateTime.utc()): boolean {
    const expiresAt = DateTime.fromISO(expiresAtISO, { zone: 'utc' });
    return now >= expiresAt.minus({ milliseconds: SESSION_HALF_LIFE_MS });
  }

  getNewExpiry(now = DateTime.utc()): string {
    return now.plus({ milliseconds: SESSION_LIFETIME_MS }).toISO();
  }
}
