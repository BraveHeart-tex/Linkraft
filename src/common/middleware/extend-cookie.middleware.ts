import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  SESSION_COOKIE_MAX_AGE,
  SESSION_TOKEN_COOKIE_NAME,
} from 'src/modules/auth/auth.constants';

@Injectable()
export class ExtendCookieMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'GET') {
      const existingCookie = req.cookies[SESSION_TOKEN_COOKIE_NAME];

      if (existingCookie) {
        res.cookie(SESSION_TOKEN_COOKIE_NAME, existingCookie, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: SESSION_COOKIE_MAX_AGE,
        });
      }
    }

    next();
  }
}
