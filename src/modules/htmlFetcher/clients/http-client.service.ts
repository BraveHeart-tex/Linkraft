import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';

@Injectable()
export class HttpClient {
  private readonly maxRedirects = 5;
  private readonly requestTimeoutMs = 10_000;

  async fetch(url: string): Promise<string> {
    return this.fetchWithRedirect(url, 0);
  }

  async fetchBinary(
    url: string
  ): Promise<{ buffer: Buffer; contentType: string }> {
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
        return this.fetchBinaryWithRedirect(redirectUrl, redirectCount + 1);
      }

      if (!response.ok) {
        throw new Error(`Request failed with status code ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || '';

      return { buffer, contentType };
    } finally {
      clearTimeout(timeout);
    }
  }
}
