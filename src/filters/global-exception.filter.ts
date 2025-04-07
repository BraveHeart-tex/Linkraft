import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseDTO } from 'src/common/response.dto';
import { ApiException } from 'src/exceptions/api.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let code = 'UNKNOWN_ERROR';
    let details = null;

    if (exception instanceof ApiException) {
      const response = exception.getResponse() as ResponseDTO<null>;
      message = exception.message;
      code = response.error.code;
      status = exception.getStatus();
      details = response.error.details;
    } else if (exception instanceof Error) {
      message = exception.message;
      code = exception.name;
    } else {
      message = 'Unknown exception';
      code = 'UNKNOWN_ERROR';
    }

    const responseDTO = new ResponseDTO({
      success: false,
      message,
      data: null,
      status,
      error: {
        code,
        details,
      },
    });

    response.status(status).json(responseDTO);
  }
}
