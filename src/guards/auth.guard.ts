import { IS_PUBLIC_ROUTE_KEY } from '@/common/decorators/public-route.decorator';
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApiException } from 'src/exceptions/api.exception';
import { SESSION_TOKEN_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { SessionService } from 'src/modules/auth/session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_ROUTE_KEY,
      context.getHandler()
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const token = request.cookies[SESSION_TOKEN_COOKIE_NAME];

    if (!token) {
      throw new ApiException(
        'Session token not provided',
        HttpStatus.UNAUTHORIZED
      );
    }

    const { user, session } = await this.sessionService.validateSession(token);

    if (!user || !session) {
      response.cookie(SESSION_TOKEN_COOKIE_NAME, '', { maxAge: 0 });

      throw new ApiException(
        'Invalid or expired session token',
        HttpStatus.UNAUTHORIZED
      );
    }

    return true;
  }
}
