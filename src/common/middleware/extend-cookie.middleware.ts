import { generateAuthTokenExpiryDate } from '@/modules/auth/utils/session-token.utils';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { SESSION_TOKEN_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class ExtendCookieMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}
  use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'GET') {
      const existingCookie = req.cookies[SESSION_TOKEN_COOKIE_NAME];

      if (existingCookie) {
        this.authService.setSessionCookie(
          res,
          existingCookie,
          generateAuthTokenExpiryDate()
        );
      }
    }

    next();
  }
}
