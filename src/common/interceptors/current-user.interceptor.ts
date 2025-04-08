import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { SESSION_TOKEN_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { SessionService } from 'src/modules/auth/session.service';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(private sessionService: SessionService) {}
  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies[SESSION_TOKEN_COOKIE_NAME];

    if (token) {
      const { user, session } =
        await this.sessionService.validateSessionToken(token);
      if (user && session) {
        request.currentUser = {
          id: user.id,
          visibleName: user.visibleName,
          email: user.email,
          createdAt: user.createdAt,
          isActive: user.isActive,
          profilePicture: user.profilePicture,
        };
        request.currentSession = session;
      }
    } else {
      request.currentUser = null;
      request.currentSession = null;
    }

    return next.handle();
  }
}
