import { HttpStatus, Injectable } from '@nestjs/common';
import { SignInDto } from 'src/common/validation/schemas/sign-in.schema';
import { SignUpDto } from 'src/common/validation/schemas/sign-up.schema';
import { SessionService } from './session.service';
import {
  generateSessionToken,
  generateAuthTokenExpiryDate,
} from './utils/token.utils';
import { UserService } from '../user/user.service';
import { hashPassword, verifyPassword } from './utils/password.utils';
import { Transactional } from '@nestjs-cls/transactional';
import { CookieService } from './cookie.service';
import { Response } from 'express';
import { SESSION_TOKEN_COOKIE_NAME } from './auth.constants';
import { ApiException } from 'src/exceptions/api.exception';
import { Session, UserWithoutPasswordHash } from 'src/db/schema';

@Injectable()
export class AuthService {
  constructor(
    private sessionService: SessionService,
    private userService: UserService,
    private cookieService: CookieService
  ) {}

  @Transactional()
  async signUp(
    res: Response,
    signUpDto: SignUpDto
  ): Promise<{
    user: UserWithoutPasswordHash;
    session: Session;
  }> {
    const existingUser = await this.userService.findUserByEmail(
      signUpDto.email
    );

    if (existingUser) {
      throw new ApiException(
        'CONFLICT',
        'Provided email is already in use',
        HttpStatus.CONFLICT
      );
    }

    const passwordHash = await hashPassword(signUpDto.password);
    const createdUser = await this.userService.createUser({
      email: signUpDto.email,
      passwordHash,
      visibleName: signUpDto.visibleName,
    });

    const token = generateSessionToken();
    const session = await this.sessionService.createSession(
      token,
      createdUser.id
    );

    this.setSessionCookie(res, token, generateAuthTokenExpiryDate());
    return {
      user: {
        email: createdUser.email,
        id: createdUser.id,
        createdAt: createdUser.createdAt,
        isActive: createdUser.isActive,
        profilePicture: createdUser.profilePicture,
        visibleName: createdUser.visibleName,
      },
      session,
    };
  }

  async signIn(
    res: Response,
    signInDto: SignInDto
  ): Promise<{
    user: UserWithoutPasswordHash;
    session: Session;
  }> {
    const existingUser = await this.userService.findUserByEmail(
      signInDto.email
    );

    if (!existingUser) {
      throw new ApiException(
        'UNAUTHORIZED',
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
        'UNAUTHORIZED',
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED
      );
    }

    const token = generateSessionToken();
    const session = await this.sessionService.createSession(
      token,
      existingUser.id
    );

    this.setSessionCookie(res, token, generateAuthTokenExpiryDate());

    return {
      user: {
        id: existingUser.id,
        email: existingUser.email,
        createdAt: existingUser.createdAt,
        isActive: existingUser.isActive,
        profilePicture: existingUser.profilePicture,
        visibleName: existingUser.visibleName,
      },
      session,
    };
  }

  async signOut(res: Response, sessionId: string) {
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
