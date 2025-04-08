import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionValidationResult } from 'src/modules/auth/session.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SessionValidationResult => {
    const request = ctx.switchToHttp().getRequest();
    return {
      user: request?.currentUser || null,
      session: request?.currentSession || null,
    };
  }
);
