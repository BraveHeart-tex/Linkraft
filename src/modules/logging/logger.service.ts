import { createPinoLogger } from '@/modules/logging/pino-logger';
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

const pino = createPinoLogger();

interface LoggerOptions {
  context?: string;
  trace?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private readonly cls: ClsService) {}

  private formatMessage(message: unknown, context?: string) {
    const correlationId = this.cls.get('correlationId') || 'N/A';
    const userId = this.cls.get('userId') || 'anonymous';

    return {
      message,
      context,
      correlationId,
      userId,
    };
  }

  log(message: unknown, options: LoggerOptions = {}) {
    pino.info({
      ...this.formatMessage(message, options.context),
      ...options.meta,
    });
  }

  error(message: unknown, options: LoggerOptions = {}) {
    pino.error({
      ...this.formatMessage(message, options.context),
      trace: options.trace,
      ...options.meta,
    });
  }

  warn(message: unknown, options: LoggerOptions = {}) {
    pino.warn({
      ...this.formatMessage(message, options.context),
      ...options.meta,
    });
  }

  debug(message: unknown, options: LoggerOptions = {}) {
    pino.debug({
      ...this.formatMessage(message, options.context),
      ...options.meta,
    });
  }

  verbose(message: unknown, options: LoggerOptions = {}) {
    pino.trace({
      ...this.formatMessage(message, options.context),
      ...options.meta,
    });
  }
}
