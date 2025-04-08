import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  SESSION_COOKIE_MAX_AGE,
  SESSION_TOKEN_COOKIE_NAME,
} from 'src/modules/auth/auth.constants';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class ExtendCookieMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) {}
  use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'GET') {
      const existingCookie = req.cookies[SESSION_TOKEN_COOKIE_NAME];

      if (existingCookie) {
        const expirationDate = new Date();
        expirationDate.setTime(
          expirationDate.getTime() + SESSION_COOKIE_MAX_AGE
        );
        this.authService.setSessionCookie(res, existingCookie, expirationDate);
      }
    }

    next();
  }
}
