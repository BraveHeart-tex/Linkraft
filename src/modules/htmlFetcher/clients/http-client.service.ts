import { HTTP_CLIENT_DEFAULTS } from '@/common/constants/http.constants';
import { sleep } from '@/common/utils/sleep.utils';
import { isDataImageUrl, isValidImageMimeType } from '@/common/utils/url.utils';
import { AppConfigService } from '@/config/app-config.service';
import { RetryableException } from '@/exceptions/retryable.exception';
import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';

interface HttpClientConfig {
  defaultHeaders: HeadersInit;
  maxRedirects: number;
  maxRetries: number;
  baseRetryDelayMs: number;
  requestTimeoutMs: number;
  maxDataUrlSizeBytes: number;
}

@Injectable()
export class HttpClient {
  private readonly config: HttpClientConfig;

  constructor(private readonly configService: AppConfigService) {
    this.config = {
      defaultHeaders: HTTP_CLIENT_DEFAULTS.DEFAULT_HEADERS,
      maxRedirects: this.configService.get(
        'HTTP_MAX_REDIRECTS',
        HTTP_CLIENT_DEFAULTS.MAX_REDIRECTS
      ),
      maxRetries: this.configService.get(
        'HTTP_MAX_RETRIES',
        HTTP_CLIENT_DEFAULTS.MAX_RETRIES
      ),
      requestTimeoutMs: this.configService.get(
        'HTTP_TIMEOUT_MS',
        HTTP_CLIENT_DEFAULTS.TIMEOUT_MS
      ),
      baseRetryDelayMs: this.configService.get(
        'HTTP_BASE_RETRY_DELAY_MS',
        HTTP_CLIENT_DEFAULTS.BASE_RETRY_DELAY_MS
      ),
      maxDataUrlSizeBytes: this.configService.get(
        'HTTP_MAX_DATA_URL_SIZE_BYTES',
        HTTP_CLIENT_DEFAULTS.MAX_DATA_URL_SIZE_BYTES
      ),
    };
  }

  async fetch(url: string): Promise<string> {
    return this.fetchWithRedirect(url, 0);
  }

  async fetchBinary(
    rawUrl: string
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (isDataImageUrl(rawUrl)) {
      return this.handleDataUrl(rawUrl);
    }
    let url = rawUrl;
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }

    return this.fetchBinaryWithRedirect(url, 0);
  }

  private async fetchWithRedirect(
    url: string,
    redirectCount: number
  ): Promise<string> {
    if (redirectCount > this.config.maxRedirects) {
      throw new Error(`Too many redirects (> ${this.config.maxRedirects})`);
    }

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.requestTimeoutMs
      );
      try {
        const response = await fetch(url, {
          headers: this.config.defaultHeaders,
          redirect: 'manual',
          signal: controller.signal,
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            throw new Error(
              `Redirect status ${response.status} missing Location header`
            );
          }
          const redirectUrl = new URL(location, url).toString();
          return this.fetchWithRedirect(redirectUrl, redirectCount + 1);
        }

        if (!response.ok) {
          const isRetryableStatus =
            [408, 429].includes(response.status) || response.status >= 500;
          const isForbidden = response.status === 403;

          if (isRetryableStatus) {
            throw new RetryableException(`Retryable error: ${response.status}`);
          }

          if (isForbidden && redirectCount === 0 && attempt === 0) {
            const fallbackUrl = this.getFallbackRootUrl(url);
            if (fallbackUrl && fallbackUrl !== url) {
              return this.fetchWithRedirect(fallbackUrl, redirectCount + 1);
            }
          }

          throw new Error(`Request failed with status code ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        let headBuffer = '';
        const decoder = new TextDecoder();
        const headEndTag = '</head>';
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          if (value) {
            headBuffer += decoder.decode(value, { stream: true });
            const idx = headBuffer.toLowerCase().indexOf(headEndTag);
            if (idx !== -1) {
              headBuffer = headBuffer.slice(0, idx + headEndTag.length);
              done = true;
              break;
            }
          }
          if (readerDone) break;
        }

        return headBuffer;
      } catch (error) {
        const isLastAttempt = attempt === this.config.maxRetries;

        const isAbortError =
          error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('aborted'));

        const isRetryable = error instanceof RetryableException || isAbortError;

        if (isRetryable) {
          if (isLastAttempt) {
            throw new Error(
              `All retries failed: ${error instanceof Error ? error.message : 'unknown error'}`
            );
          }

          const backoff = this.config.baseRetryDelayMs * 2 ** attempt;
          const jitter = Math.floor(Math.random() * 100);
          await sleep(backoff + jitter);
          continue;
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error(
      `Failed to fetch after ${this.config.maxRetries + 1} attempts`
    );
  }

  private async fetchBinaryWithRedirect(
    url: string,
    redirectCount: number
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (redirectCount > this.config.maxRedirects) {
      throw new Error(`Too many redirects (> ${this.config.maxRedirects})`);
    }

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.requestTimeoutMs
      );

      try {
        const response = await fetch(url, {
          headers: this.config.defaultHeaders,
          redirect: 'manual',
          signal: controller.signal,
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            throw new Error(
              `Redirect status ${response.status} missing Location header`
            );
          }
          const redirectUrl = new URL(location, url).toString();
          return this.fetchBinaryWithRedirect(redirectUrl, redirectCount + 1);
        }

        if (!response.ok) {
          const isRetryableStatus =
            [408, 429].includes(response.status) || response.status >= 500;
          const isForbidden = response.status === 403;

          if (isRetryableStatus) {
            throw new RetryableException(`Retryable error: ${response.status}`);
          }

          if (isForbidden && redirectCount === 0 && attempt === 0) {
            const fallbackUrl = this.getFallbackRootUrl(url);
            if (fallbackUrl && fallbackUrl !== url) {
              return this.fetchBinaryWithRedirect(
                fallbackUrl,
                redirectCount + 1
              );
            }
          }

          throw new Error(`Request failed with status code ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || '';

        if (!isValidImageMimeType(contentType)) {
          throw new Error(`Invalid content-type for favicon: ${contentType}`);
        }

        return { buffer, contentType };
      } catch (error) {
        const isLastAttempt = attempt === this.config.maxRetries;

        const isAbortError =
          error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('aborted'));

        const isRetryable = error instanceof RetryableException || isAbortError;

        if (isRetryable) {
          if (isLastAttempt) {
            throw new Error(
              `All retries failed: ${error instanceof Error ? error.message : 'unknown error'}`
            );
          }

          const backoff = this.config.baseRetryDelayMs * 2 ** attempt;
          const jitter = Math.floor(Math.random() * 100);
          await sleep(backoff + jitter);
          continue;
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(
      `Failed to fetch binary after ${this.config.maxRetries + 1} attempts`
    );
  }

  private async handleDataUrl(
    dataUrl: string
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (!dataUrl.startsWith('data:')) {
      throw new Error("Invalid data URL: must start with 'data:'");
    }

    const firstComma = dataUrl.indexOf(',');
    if (firstComma === -1) {
      throw new Error('Invalid data URL: missing comma separator');
    }

    const meta = dataUrl.slice(5, firstComma); // everything after "data:" and before comma
    const data = dataUrl.slice(firstComma + 1);

    const metaParts = meta.split(';');
    const mimeType = metaParts[0]?.toLowerCase();
    const isBase64 = metaParts.includes('base64');

    if (!mimeType || !isValidImageMimeType(mimeType)) {
      throw new Error(`Unsupported or missing image MIME type: ${mimeType}`);
    }

    const approximateSize = isBase64
      ? (data.length * 3) / 4
      : decodeURIComponent(data).length;

    if (approximateSize > this.config.maxDataUrlSizeBytes) {
      throw new Error('Data URL exceeds maximum size');
    }

    let buffer: Buffer;

    try {
      buffer = isBase64
        ? Buffer.from(data, 'base64')
        : Buffer.from(decodeURIComponent(data), 'utf8');
    } catch (e) {
      throw new Error(
        `Failed to decode image data: ${e instanceof Error ? e.message : 'unknown error'}`
      );
    }

    if (buffer.length > this.config.maxDataUrlSizeBytes) {
      throw new Error('Decoded image exceeds maximum allowed size');
    }

    return { buffer, contentType: mimeType };
  }

  private getFallbackRootUrl(originalUrl: string): string | null {
    try {
      const parsed = new URL(originalUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return null;
    }
  }
}
