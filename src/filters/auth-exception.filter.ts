import {
  Catch,
  ExceptionFilter,
  ForbiddenException,
  UnauthorizedException,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseDTO } from 'src/common/response.dto';

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

    response.status(status).json(
      new ResponseDTO({
        success: false,
        message: exception.message || 'Authentication required',
        data: null,
        status,
        error: {
          code: status === HttpStatus.FORBIDDEN ? 'FORBIDDEN' : 'AUTH_ERROR',
        },
      })
    );
  }
}
