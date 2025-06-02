import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { SESSION_TOKEN_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { SessionService } from 'src/modules/auth/session.service';
import { toUserWithoutPassword } from 'src/modules/user/mappers/user.mapper';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(private readonly sessionService: SessionService) {}
  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies[SESSION_TOKEN_COOKIE_NAME];

    if (token) {
      const { user, session } =
        await this.sessionService.validateSession(token);
      if (user && session) {
        request.currentUser = toUserWithoutPassword(user);
        request.currentSession = session;
      }
    } else {
      request.currentUser = null;
      request.currentSession = null;
    }

    return next.handle();
  }
}
