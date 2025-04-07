import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseDTO } from 'src/common/response.dto';
import { ZodError } from 'zod';

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const details: Record<string, string> = {};
    for (const issue of exception.errors) {
      const key = issue.path.join('.') || 'unknown';
      details[key] = issue.message;
    }

    response.status(HttpStatus.BAD_REQUEST).json(
      new ResponseDTO({
        success: false,
        message: 'Validation failed',
        status: HttpStatus.BAD_REQUEST,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details,
        },
      })
    );
  }
}
