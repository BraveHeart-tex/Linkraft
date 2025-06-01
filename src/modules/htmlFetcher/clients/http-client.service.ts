import { sleep } from '@/common/utils/sleep.utils';
import { isDataImageUrl, isValidImageMimeType } from '@/common/utils/url.utils';
import { RetryableException } from '@/exceptions/retryable.exception';
import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';

const MAX_DATA_URL_SIZE_BYTES = 100 * 1024; // 100 KB max for favicon data

@Injectable()
export class HttpClient {
  // TODO: Make this config based
  private readonly defaultHeaders: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.google.com/',
  };
  private readonly maxRetries = 3;
  private readonly maxRedirects = 5;
  private readonly requestTimeoutMs = 10_000;
  private readonly baseRetryDelayMs = 300;

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
    if (redirectCount > this.maxRedirects) {
      throw new Error(`Too many redirects (> ${this.maxRedirects})`);
    }

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.requestTimeoutMs
      );
      try {
        const response = await fetch(url, {
          headers: this.defaultHeaders,
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
        const isLastAttempt = attempt === this.maxRetries;

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

          const backoff = this.baseRetryDelayMs * 2 ** attempt;
          const jitter = Math.floor(Math.random() * 100);
          await sleep(backoff + jitter);
          continue;
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error(`Failed to fetch after ${this.maxRetries + 1} attempts`);
  }

  private async fetchBinaryWithRedirect(
    url: string,
    redirectCount: number
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (redirectCount > this.maxRedirects) {
      throw new Error(`Too many redirects (> ${this.maxRedirects})`);
    }

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.requestTimeoutMs
      );

      try {
        const response = await fetch(url, {
          headers: this.defaultHeaders,
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
          if (
            response.status >= 500 ||
            response.status === 408 ||
            response.status === 429
          ) {
            throw new RetryableException(`Retryable error: ${response.status}`);
          } else {
            throw new Error(
              `Request failed with status code ${response.status}`
            );
          }
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || '';

        if (!isValidImageMimeType(contentType)) {
          throw new Error(`Invalid content-type for favicon: ${contentType}`);
        }

        return { buffer, contentType };
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;

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

          const backoff = this.baseRetryDelayMs * 2 ** attempt;
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
      `Failed to fetch binary after ${this.maxRetries + 1} attempts`
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

    if (approximateSize > MAX_DATA_URL_SIZE_BYTES) {
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

    if (buffer.length > MAX_DATA_URL_SIZE_BYTES) {
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
