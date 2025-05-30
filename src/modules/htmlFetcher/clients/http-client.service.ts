import { HTTP_CLIENT_DEFAULTS } from '@/common/constants/http.constants';
import { isValidHttpUrl } from '@/common/utils/url.utils';
import { AppConfigService } from '@/config/app-config.service';
import { ApiException } from '@/exceptions/api.exception';
import { HttpStatus, Injectable } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { IHttpClient } from 'src/modules/htmlFetcher/html-fetcher.types';

interface HttpClientConfig {
  maxRedirects: number;
  requestTimeoutMs: number;
  userAgent: string;
  maxContentLength: number;
}

@Injectable()
export class HttpClient implements IHttpClient {
  private readonly config: HttpClientConfig;

  constructor(private readonly configService: AppConfigService) {
    this.config = {
      maxRedirects: this.configService.get(
        'HTTP_MAX_REDIRECTS',
        HTTP_CLIENT_DEFAULTS.MAX_REDIRECTS
      ),
      requestTimeoutMs: this.configService.get(
        'HTTP_TIMEOUT_MS',
        HTTP_CLIENT_DEFAULTS.TIMEOUT_MS
      ),
      userAgent: this.configService.get(
        'HTTP_USER_AGENT',
        HTTP_CLIENT_DEFAULTS.USER_AGENT
      ),
      maxContentLength: this.configService.get(
        'HTTP_MAX_CONTENT_LENGTH',
        HTTP_CLIENT_DEFAULTS.MAX_CONTENT_LENGTH
      ),
    };
  }

  async fetch(url: string): Promise<string> {
    this.validateUrl(url);
    return this.fetchWithRedirect(url, 0);
  }

  async fetchBinary(
    url: string
  ): Promise<{ buffer: Buffer; contentType: string }> {
    this.validateUrl(url);
    return this.fetchBinaryWithRedirect(url, 0);
  }

  private validateUrl(url: string): void {
    if (!isValidHttpUrl(url)) {
      throw new ApiException(
        'Please provide a valid http/https URL',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private fetchWithRedirect(
    rawUrl: string,
    redirectCount: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (redirectCount > this.config.maxRedirects) {
        return reject(
          new Error(`Too many redirects (> ${this.config.maxRedirects})`)
        );
      }
      const parsedUrl = new URL(rawUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(this.buildRequestOptions(parsedUrl), (res) => {
        if (this.isRedirectStatus(res.statusCode)) {
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
            redirectUrl = new URL(location, rawUrl).toString();
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
        if (!this.isSuccessStatus(res.statusCode)) {
          res.destroy();
          return reject(
            new ApiException(
              `Request failed with status code ${res.statusCode}`,
              this.mapHttpStatusToNestStatus(res.statusCode)
            )
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
      });

      req.on('error', reject);
      req.setTimeout(this.config.requestTimeoutMs, () => {
        req.destroy(new Error('Request timed out'));
      });
    });
  }

  private fetchBinaryWithRedirect(
    url: string,
    redirectCount: number
  ): Promise<{ buffer: Buffer; contentType: string }> {
    return new Promise((resolve, reject) => {
      if (redirectCount > this.config.maxRedirects) {
        return reject(
          new Error(`Too many redirects (> ${this.config.maxRedirects})`)
        );
      }

      const client = url.startsWith('https') ? https : http;

      const req = client.get(
        url,
        { headers: { 'User-Agent': 'LinkraftBot/1.0' } },
        (res) => {
          // Handle redirects
          if (this.isRedirectStatus(res.statusCode)) {
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

          if (!this.isSuccessStatus(res.statusCode)) {
            res.destroy();
            return reject(
              new ApiException(
                `Request failed with status code ${res.statusCode}`,
                this.mapHttpStatusToNestStatus(res.statusCode)
              )
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
      req.setTimeout(this.config.requestTimeoutMs, () => {
        req.destroy(new Error('Request timed out'));
      });
    });
  }

  private buildRequestOptions(parsedUrl: URL) {
    return {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port ? Number(parsedUrl.port) : undefined,
      path: encodeURI(parsedUrl.pathname + parsedUrl.search),
      headers: {
        'User-Agent': this.config.userAgent,
        Accept: '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'close',
      },
    };
  }

  private isRedirectStatus(statusCode?: number): boolean {
    return (
      statusCode !== undefined &&
      [
        HttpStatus.MOVED_PERMANENTLY,
        HttpStatus.FOUND,
        HttpStatus.SEE_OTHER,
        HttpStatus.TEMPORARY_REDIRECT,
        HttpStatus.PERMANENT_REDIRECT,
      ].includes(statusCode)
    );
  }

  private isSuccessStatus(statusCode?: number): boolean {
    return statusCode !== undefined && statusCode >= 200 && statusCode < 300;
  }

  private mapHttpStatusToNestStatus(statusCode?: number): HttpStatus {
    if (!statusCode) return HttpStatus.INTERNAL_SERVER_ERROR;

    if (statusCode >= 400 && statusCode < 500) {
      return statusCode as HttpStatus;
    }

    if (statusCode >= 500) {
      return HttpStatus.BAD_GATEWAY;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
