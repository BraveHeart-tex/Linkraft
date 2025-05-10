import { sha256 } from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import { SESSION_LIFETIME_MS } from '../auth.constants';

export const generateSessionToken = (): string => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
};

export const getSessionId = (token: string): string => {
  const encoded = new TextEncoder().encode(token);
  return encodeHexLowerCase(sha256(encoded));
};

export const generateAuthTokenExpiryDate = (): Date => {
  const expirationDate = new Date();
  expirationDate.setTime(expirationDate.getTime() + SESSION_LIFETIME_MS);
  return expirationDate;
};

export const parseCookies = (cookieHeader: string): Record<string, string> => {
  return cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, ...v] = cookie.trim().split('=');
      if (!key) return acc;
      acc[key] = decodeURIComponent(v.join('='));
      return acc;
    },
    {} as Record<string, string>
  );
};
