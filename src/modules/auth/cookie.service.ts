import { Injectable } from '@nestjs/common';
import { CookieOptions, Response } from 'express';

@Injectable()
export class CookieService {
  setCookie(
    res: Response,
    name: string,
    value: string,
    options: CookieOptions
  ): void {
    res.cookie(name, value, options);
  }

  clearCookie(res: Response, name: string, options?: CookieOptions): void {
    res.cookie(name, '', { ...options, maxAge: 0 });
  }
}
