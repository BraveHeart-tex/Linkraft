import { Injectable, Logger } from '@nestjs/common';
import { highlightSQL } from './sql-highlighter.util';
import { performance } from 'perf_hooks';
import chalk from 'chalk';

@Injectable()
export class DrizzleLoggerService extends Logger {
  constructor() {
    super('Drizzle');
  }

  logQuery(query: string, params: unknown[]) {
    const start = performance.now();

    const logEnd = () => {
      const duration = performance.now() - start;
      const type = this.detectQueryType(query);
      const formatted = this.formatQuery(type, query, params, duration);
      this.log(formatted);
    };

    setImmediate(logEnd);
  }

  private detectQueryType(
    query: string
  ): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER' {
    const match = query
      .trim()
      .toUpperCase()
      .match(/^(SELECT|INSERT|UPDATE|DELETE)/);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (match?.[1] as any) || 'OTHER';
  }

  private formatQuery(
    type: string,
    query: string,
    params: unknown[],
    duration: number
  ): string {
    const colorMap = {
      SELECT: chalk.greenBright,
      INSERT: chalk.cyanBright,
      UPDATE: chalk.yellowBright,
      DELETE: chalk.redBright,
      OTHER: chalk.whiteBright,
    };

    const tag = colorMap[type as keyof typeof colorMap](`[${type}]`);
    const time = chalk.gray(`(${duration.toFixed(1)} ms)`);
    const highlightedQuery = highlightSQL(query);
    const formattedParams =
      params && params.length > 0
        ? `${chalk.magentaBright('↳ Params:')} ${chalk.yellowBright(JSON.stringify(params))}`
        : '';

    return `${tag} ${time}\n${highlightedQuery}\n${formattedParams}\n`;
  }
}
