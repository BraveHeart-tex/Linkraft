import { Injectable } from '@nestjs/common';
import { IRetryStrategy } from 'src/modules/htmlFetcher/html-fetcher.types';

@Injectable()
export class RetryStrategy implements IRetryStrategy {
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 3000;
  private readonly maxDelayMs = 15000;

  shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.maxRetries) return false;
    if (!(error instanceof Error)) return false;

    const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'];

    if (
      'code' in error &&
      typeof error.code === 'string' &&
      networkErrors.includes(error.code)
    ) {
      return true;
    }

    if (error.message.toLowerCase().includes('timed out')) return true;

    const statusMatch = error.message.match(/status code (\d+)/);
    if (statusMatch !== null && statusMatch[1] !== undefined) {
      const status = parseInt(statusMatch[1], 10);
      if (status >= 500 && status < 600) return true;
    }

    return false;
  }

  getDelay(attempt: number): number {
    return Math.min(this.baseDelayMs * 2 ** (attempt - 1), this.maxDelayMs);
  }
}
