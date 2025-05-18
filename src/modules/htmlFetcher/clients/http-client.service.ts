import { HttpStatus, Injectable } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { IHttpClient } from 'src/modules/htmlFetcher/html-fetcher.types';

@Injectable()
export class HttpClient implements IHttpClient {
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

  private fetchWithRedirect(
    url: string,
    redirectCount: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (redirectCount > this.maxRedirects) {
        return reject(new Error(`Too many redirects (> ${this.maxRedirects})`));
      }

      const client = url.startsWith('https') ? https : http;

      const req = client.get(
        url,
        { headers: { 'User-Agent': 'LinkraftBot/1.0' } },
        (res) => {
          // Handle redirects
          if (
            res.statusCode &&
            [
              HttpStatus.MOVED_PERMANENTLY,
              HttpStatus.FOUND,
              HttpStatus.SEE_OTHER,
              HttpStatus.TEMPORARY_REDIRECT,
              HttpStatus.PERMANENT_REDIRECT,
            ].includes(res.statusCode)
          ) {
            const location = res.headers.location;
            if (!location) {
              res.destroy();
              return reject(
                new Error(
                  `Redirect status ${res.statusCode} missing Location header`
                )
              );
            }
            let redirectUrl: string;
            try {
              redirectUrl = new URL(location, url).toString();
            } catch {
              res.destroy();
              return reject(new Error(`Invalid redirect URL: ${location}`));
            }
            res.destroy();
            return resolve(
              this.fetchWithRedirect(redirectUrl, redirectCount + 1)
            );
          }

          // Non-success status codes
          if (
            res.statusCode &&
            (res.statusCode < 200 || res.statusCode >= 300)
          ) {
            res.destroy();
            return reject(
              new Error(`Request failed with status code ${res.statusCode}`)
            );
          }

          let headBuffer = '';
          const headEndTag = '</head>';
          let done = false;

          res.on('data', (chunk: Buffer) => {
            if (done) return;
            headBuffer += chunk.toString();
            const idx = headBuffer.toLowerCase().indexOf(headEndTag);
            if (idx !== -1) {
              done = true;
              headBuffer = headBuffer.slice(0, idx + headEndTag.length);
              res.destroy();
              resolve(headBuffer);
            }
          });

          res.on('end', () => {
            if (!done) {
              resolve(headBuffer);
            }
          });

          res.on('error', (err) => {
            if (!done) {
              done = true;
              reject(err);
            }
          });
        }
      );

      req.on('error', reject);
      req.setTimeout(this.requestTimeoutMs, () => {
        req.destroy(new Error('Request timed out'));
      });
    });
  }

  private fetchBinaryWithRedirect(
    url: string,
    redirectCount: number
  ): Promise<{ buffer: Buffer; contentType: string }> {
    return new Promise((resolve, reject) => {
      if (redirectCount > this.maxRedirects) {
        return reject(new Error(`Too many redirects (> ${this.maxRedirects})`));
      }

      const client = url.startsWith('https') ? https : http;

      const req = client.get(
        url,
        { headers: { 'User-Agent': 'LinkraftBot/1.0' } },
        (res) => {
          // Handle redirects
          if (
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode)
          ) {
            const location = res.headers.location;
            if (!location) {
              res.destroy();
              return reject(
                new Error(
                  `Redirect status ${res.statusCode} missing Location header`
                )
              );
            }
            let redirectUrl: string;
            try {
              redirectUrl = new URL(location, url).toString();
            } catch {
              res.destroy();
              return reject(new Error(`Invalid redirect URL: ${location}`));
            }
            res.destroy();
            return resolve(
              this.fetchBinaryWithRedirect(redirectUrl, redirectCount + 1)
            );
          }

          if (
            res.statusCode &&
            (res.statusCode < 200 || res.statusCode >= 300)
          ) {
            res.destroy();
            return reject(
              new Error(`Request failed with status code ${res.statusCode}`)
            );
          }

          const contentType = res.headers['content-type'] || '';

          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            resolve({
              buffer: Buffer.concat(chunks),
              contentType,
            });
          });

          res.on('error', reject);
        }
      );

      req.on('error', reject);
      req.setTimeout(this.requestTimeoutMs, () => {
        req.destroy(new Error('Request timed out'));
      });
    });
  }
}
