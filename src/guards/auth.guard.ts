import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiException } from 'src/exceptions/api.exception';
import { SESSION_TOKEN_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { SessionService } from 'src/modules/auth/session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private sessionService: SessionService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies[SESSION_TOKEN_COOKIE_NAME];

    if (!token) {
      throw new ApiException(
        'UNAUTHORIZED',
        'Session token not provided',
        HttpStatus.UNAUTHORIZED
      );
    }

    const { user, session } =
      await this.sessionService.validateAndRefreshSession(token);

    if (!user || !session) {
      throw new ApiException(
        'UNAUTHORIZED',
        'Invalid or expired session token',
        HttpStatus.UNAUTHORIZED
      );
    }

    return true;
  }
}
