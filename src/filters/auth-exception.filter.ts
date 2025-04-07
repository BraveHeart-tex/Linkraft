import {
  Catch,
  ExceptionFilter,
  ForbiddenException,
  UnauthorizedException,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(UnauthorizedException, ForbiddenException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(
    exception: UnauthorizedException | ForbiddenException,
    host: ArgumentsHost
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof ForbiddenException
        ? HttpStatus.FORBIDDEN
        : HttpStatus.UNAUTHORIZED;

    response.status(status).json({
      success: false,
      data: null,
      message: exception.message || 'Authentication required',
      error: {
        code: status === HttpStatus.FORBIDDEN ? 'FORBIDDEN' : 'AUTH_ERROR',
      },
    });
  }
}
