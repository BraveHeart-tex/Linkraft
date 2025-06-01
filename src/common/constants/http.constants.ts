export const HTTP_CLIENT_DEFAULTS = {
  DEFAULT_HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.google.com/',
  },
  MAX_REDIRECTS: 5,
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY_MS: 300,
  TIMEOUT_MS: 10_000,
  MAX_DATA_URL_SIZE_BYTES: 100 * 1024,
} as const;
