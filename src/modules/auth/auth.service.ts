import { Transactional } from '@nestjs-cls/transactional';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { SignInInput } from 'src/common/validation/schemas/auth/sign-in.schema';
import { SignUpInput } from 'src/common/validation/schemas/auth/sign-up.schema';
import { Session, UserWithoutPasswordHash } from 'src/db/schema';
import { ApiException } from 'src/exceptions/api.exception';
import { toUserWithoutPassword } from '../user/mappers/user.mapper';
import { UserService } from '../user/user.service';
import { SESSION_TOKEN_COOKIE_NAME } from './auth.constants';
import { CookieService } from './cookie.service';
import { SessionService } from './session.service';
import { hashPassword, verifyPassword } from './utils/password.utils';
import {
  generateAuthTokenExpiryDate,
  generateSessionToken,
} from './utils/session-token.utils';

@Injectable()
export class AuthService {
  constructor(
    private sessionService: SessionService,
    private userService: UserService,
    private cookieService: CookieService
  ) {}

  @Transactional()
  async registerUserWithSession(
    res: Response,
    signUpDto: SignUpInput
  ): Promise<{
    user: UserWithoutPasswordHash;
  }> {
    const existingUser = await this.userService.getUserByEmail(signUpDto.email);

    if (existingUser) {
      throw new ApiException(
        'Provided email is already in use',
        HttpStatus.CONFLICT
      );
    }

    const passwordHash = await hashPassword(signUpDto.password);
    const createdUser = await this.userService.signUpUser({
      email: signUpDto.email,
      passwordHash,
      visibleName: signUpDto.visibleName,
    });

    const token = generateSessionToken();
    await this.sessionService.createUserSession(token, createdUser.id);

    this.setSessionCookie(res, token, generateAuthTokenExpiryDate());
    return {
      user: toUserWithoutPassword(createdUser),
    };
  }

  async authenticateUserAndCreateSession(
    res: Response,
    signInDto: SignInInput
  ): Promise<{
    user: UserWithoutPasswordHash;
  }> {
    const existingUser = await this.userService.getUserByEmail(signInDto.email);

    if (!existingUser) {
      throw new ApiException(
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED
      );
    }

    const isPasswordCorrect = await verifyPassword(
      existingUser.passwordHash,
      signInDto.password
    );

    if (!isPasswordCorrect) {
      throw new ApiException(
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED
      );
    }

    const token = generateSessionToken();
    await this.sessionService.createUserSession(token, existingUser.id);

    this.setSessionCookie(res, token, generateAuthTokenExpiryDate());

    return {
      user: toUserWithoutPassword(existingUser),
    };
  }

  async logoutUser(res: Response, sessionId: Session['id']) {
    await this.sessionService.invalidateSession(sessionId);
    this.deleteSessionCookie(res);
  }

  setSessionCookie(res: Response, token: string, expiresAt: Date) {
    const isProd = process.env.NODE_ENV === 'production';
    this.cookieService.setCookie(res, SESSION_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      expires: expiresAt,
      path: '/',
    });
  }

  deleteSessionCookie(res: Response) {
    this.cookieService.clearCookie(res, SESSION_TOKEN_COOKIE_NAME);
  }
}
