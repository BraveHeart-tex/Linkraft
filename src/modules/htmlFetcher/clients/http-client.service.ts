import { sleep } from '@/common/utils/sleep.utils';
import { isDataImageUrl, isValidImageMimeType } from '@/common/utils/url.utils';
import { RetryableException } from '@/exceptions/retryable.exception';
import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';

const MAX_DATA_URL_SIZE_BYTES = 100 * 1024; // 100 KB max for favicon data

@Injectable()
export class HttpClient {
  // TODO: Make this config based
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'LinkraftBot/1.0' },
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
    } finally {
      clearTimeout(timeout);
    }
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
          headers: { 'User-Agent': 'LinkraftBot/1.0' },
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
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);(base64|utf8),(.*)$/.exec(
      dataUrl
    );
    if (!match) {
      throw new Error('Invalid data URL format');
    }

    const [, mimeType, encoding, data] = match;

    if (!mimeType) {
      throw new Error(`Missing image type in data URL`);
    }

    if (!isValidImageMimeType(mimeType)) {
      throw new Error(`Unsupported image type in data URL: ${mimeType}`);
    }

    if (!data) {
      throw new Error('Missing image data in data URL');
    }

    // Check size roughly before decoding (base64 expands ~33%)
    const approximateSize =
      encoding === 'base64' ? (data.length * 3) / 4 : data.length;
    if (approximateSize > MAX_DATA_URL_SIZE_BYTES) {
      throw new Error('Data URL image exceeds maximum allowed size');
    }

    let buffer: Buffer;

    try {
      buffer =
        encoding === 'base64'
          ? Buffer.from(data, 'base64')
          : Buffer.from(decodeURIComponent(data), 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to decode image data from data URL: ${error instanceof Error ? error.message : 'unknown error occurred'}`
      );
    }

    if (buffer.length > MAX_DATA_URL_SIZE_BYTES) {
      throw new Error('Decoded image exceeds maximum allowed size');
    }

    // TODO: Sanitize SVG if mimeType === 'image/svg+xml'
    if (mimeType === 'image/svg+xml') {
      // e.g., buffer = sanitizeSvg(buffer.toString('utf8'))
    }

    return { buffer, contentType: mimeType };
  }
}
