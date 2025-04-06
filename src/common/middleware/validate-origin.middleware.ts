import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ResponseDTO } from '../response.dto';

@Injectable()
export class ValidateOriginMiddleware implements NestMiddleware {
  private sendOriginErrorResponse(res: Response, message: string) {
    res.status(HttpStatus.FORBIDDEN).send(
      new ResponseDTO(false, message, null, {
        code: 'FORBIDDEN',
        details: null,
      })
    );
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.method === 'GET') {
      return next();
    }

    const originHeader = req.headers['origin'];
    const hostHeader = req.headers['host'];

    if (!originHeader || !hostHeader) {
      this.sendOriginErrorResponse(
        res,
        'Forbidden: Missing Origin or Host headers'
      );
      return;
    }

    let origin: URL;
    try {
      origin = new URL(originHeader as string);
    } catch {
      this.sendOriginErrorResponse(res, 'Forbidden: Invalid Origin');

      return;
    }

    if (origin.host !== hostHeader) {
      this.sendOriginErrorResponse(res, 'Forbidden: Origin host mismatch');
      return;
    }

    next();
  }
}
