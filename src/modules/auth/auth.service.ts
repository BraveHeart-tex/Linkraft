import { Injectable } from '@nestjs/common';
import { SignInDto } from 'src/common/validation/schemas/sign-in.schema';
import { SignUpDto } from 'src/common/validation/schemas/sign-up.schema';
import { SessionService } from './session.service';
import { generateSessionToken } from './utils/token.utils';
import { UserService } from '../user/user.service';
import { hashPassword } from './utils/password.utils';
import { Transactional } from '@nestjs-cls/transactional';
import { CookieService } from './cookie.service';
import { Response } from 'express';
import {
  SESSION_COOKIE_MAX_AGE,
  SESSION_TOKEN_COOKIE_NAME,
} from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private sessionService: SessionService,
    private userService: UserService,
    private cookieService: CookieService
  ) {}

  @Transactional()
  async signUp(res: Response, signUpDto: SignUpDto) {
    const passwordHash = await hashPassword(signUpDto.password);
    const createdUser = await this.userService.createUser({
      email: signUpDto.email,
      passwordHash,
    });

    const token = generateSessionToken();
    await this.sessionService.createSession(token, createdUser.id);
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + SESSION_COOKIE_MAX_AGE);
    this.setSessionCookie(res, token, expirationDate);
  }

  setSessionCookie(res: Response, token: string, expiresAt: Date) {
    this.cookieService.setCookie(res, SESSION_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/',
    });
  }

  deleteSessionCookie(res: Response) {
    this.cookieService.clearCookie(res, SESSION_TOKEN_COOKIE_NAME);
  }

  signIn(signInDto: SignInDto) {
    return signInDto;
  }

  signOut() {}
}
