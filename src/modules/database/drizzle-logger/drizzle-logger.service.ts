import { LoggerService } from '@/modules/logging/logger.service';
import { Injectable, Logger } from '@nestjs/common';
import { performance } from 'perf_hooks';

@Injectable()
export class DrizzleLoggerService extends Logger {
  constructor(private readonly logger: LoggerService) {
    super('Drizzle');
  }

  private detectQueryType(
    query: string
  ): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER' {
    const match = query
      .trim()
      .toUpperCase()
      .match(/^(SELECT|INSERT|UPDATE|DELETE)/);

    return (match?.[1] as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE') || 'OTHER';
  }

  logQuery(query: string, params: unknown[]) {
    const start = performance.now();

    setImmediate(() => {
      const duration = performance.now() - start;
      const type = this.detectQueryType(query);

      this.logger.debug({
        context: 'DrizzleSQL',
        queryType: type,
        query,
        params,
        durationMs: Number(duration.toFixed(2)),
      });
    });
  }
}
