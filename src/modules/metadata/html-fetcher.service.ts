import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as http from 'http';
import * as https from 'https';

interface Metadata {
  title?: string;
  description?: string;
  favicon?: string;
}

@Injectable()
export class HtmlFetcherService {
  private readonly logger = new Logger(HtmlFetcherService.name);
  private readonly maxRetries = 3;
  private readonly baseRetryDelayMs = 3000;
  private readonly maxRetryDelayMs = 15000;
  private readonly requestTimeoutMs = 10_000;

  constructor() {}

  async fetchHeadMetadataWithRetry(url: string): Promise<Metadata> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(`Fetch attempt #${attempt} for ${url}`);
        const result = await this.fetchHeadMetadata(url);
        this.logger.log(`Success on attempt #${attempt} for ${url}`);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          const shouldRetry = this.isRetryableError(error);

          if (!shouldRetry) {
            this.logger.error(
              `Non-retryable error on attempt #${attempt}: ${error.message}`,
              error.stack
            );
            throw error;
          }

          if (attempt < this.maxRetries) {
            const delay = Math.min(
              this.baseRetryDelayMs * 2 ** (attempt - 1),
              this.maxRetryDelayMs
            );
            this.logger.warn(
              `Retryable error on attempt #${attempt}: ${error.message}`
            );
            this.logger.warn(`Waiting ${delay}ms before next attempt...`);
            await this.delay(delay);
          } else {
            this.logger.error(
              `Failed after ${this.maxRetries} attempts: ${error.message}`,
              error.stack
            );
            throw new Error(
              `Failed after ${this.maxRetries} attempts: ${error.message}`
            );
          }
        }

        throw new Error(`Unexpected error on attempt #${attempt}: ${error}`);
      }
    }

    throw new Error('Unexpected retry loop exit');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // Network errors
    const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'];
    if (error.code && networkErrors.includes(error.code)) {
      return true;
    }

    // Timeout errors
    if (error.message && error.message.toLowerCase().includes('timed out')) {
      return true;
    }

    // HTTP 5xx errors encoded in message "status code XXX"
    if (error.message) {
      const statusMatch = error.message.match(/status code (\d+)/);
      if (statusMatch) {
        const status = parseInt(statusMatch[1], 10);
        if (status >= 500 && status < 600) {
          return true;
        }
      }
    }

    return false;
  }

  private fetchHeadMetadata(
    url: string,
    redirectCount = 0,
    maxRedirects = 5
  ): Promise<Metadata> {
    return new Promise((resolve, reject) => {
      try {
        const client = url.startsWith('https') ? https : http;

        const req = client.get(
          url,
          { headers: { 'User-Agent': 'LinkraftBot/1.0' } },
          (res) => {
            // Handle HTTP redirects (3xx)
            if (
              res.statusCode &&
              [301, 302, 303, 307, 308].includes(res.statusCode)
            ) {
              if (redirectCount >= maxRedirects) {
                reject(
                  new Error(
                    `Too many redirects (>${maxRedirects}) for URL: ${url}`
                  )
                );
                res.destroy();
                return;
              }

              const location = res.headers.location;
              if (!location) {
                reject(
                  new Error(
                    `Redirect status code ${res.statusCode} without Location header`
                  )
                );
                res.destroy();
                return;
              }

              // Construct absolute URL if location is relative
              let redirectUrl: string;
              try {
                redirectUrl = new URL(location, url).toString();
              } catch {
                reject(new Error(`Invalid redirect URL: ${location}`));
                res.destroy();
                return;
              }

              res.destroy(); // abort current response

              // Follow the redirect recursively
              resolve(
                this.fetchHeadMetadata(
                  redirectUrl,
                  redirectCount + 1,
                  maxRedirects
                )
              );
              return;
            }

            // Non-redirect status codes other than 2xx are errors
            if (
              res.statusCode &&
              (res.statusCode < 200 || res.statusCode >= 300)
            ) {
              reject(
                new Error(`Request failed with status code ${res.statusCode}`)
              );
              res.destroy();
              return;
            }

            let headBuffer = '';
            const headEndTag = '</head>';
            let done = false;

            res.on('data', (chunk) => {
              if (done) return;
              headBuffer += chunk.toString();

              const idx = headBuffer.toLowerCase().indexOf(headEndTag);
              if (idx !== -1) {
                done = true;
                headBuffer = headBuffer.slice(0, idx + headEndTag.length);

                // Abort the response stream to save bandwidth
                res.destroy();

                try {
                  const metadata = this.parseHeadMetadata(headBuffer, url);
                  resolve(metadata);
                } catch (parseErr) {
                  reject(parseErr);
                }
              }
            });

            res.on('end', () => {
              if (!done) {
                try {
                  const metadata = this.parseHeadMetadata(headBuffer, url);
                  resolve(metadata);
                } catch (parseErr) {
                  reject(parseErr);
                }
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

        req.on('error', (err) => {
          reject(err);
        });

        // Request timeout handling
        req.setTimeout(this.requestTimeoutMs, () => {
          req.destroy(new Error('Request timed out'));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private parseHeadMetadata(headHtml: string, originalUrl: string): Metadata {
    const $ = cheerio.load(headHtml);

    const title = $('title').text().trim();

    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    let favicon =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href') ||
      '';

    if (favicon && !favicon.startsWith('http')) {
      try {
        const base = new URL(originalUrl);
        favicon = new URL(favicon, base).toString();
      } catch {
        // ignore URL parsing errors
      }
    }

    return { title, description, favicon };
  }
}
