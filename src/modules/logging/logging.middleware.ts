import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    this.cls.run(() => {
      const correlationId =
        req.headers['x-correlation-id'] ?? crypto.randomUUID();
      this.cls.set('correlationId', correlationId);
      req.headers['x-correlation-id'] = correlationId;
      next();
    });
  }
}
