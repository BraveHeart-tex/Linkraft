export const SESSION_TOKEN_COOKIE_NAME = 'session' as const;
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export const SESSION_HALF_LIFE_MS = SESSION_LIFETIME_MS / 2;

export const MIN_PASSWORD_LENGTH = 8 as const;
export const MAX_PASSWORD_LENGTH = 255 as const;
