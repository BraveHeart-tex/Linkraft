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
      const apiResponse = exception.getResponse() as ResponseDTO<null>;
      message = exception.message;
      code = apiResponse.error.code;
      status = exception.getStatus();
      details = apiResponse.error.details;
    } else if (exception instanceof Error) {
      message = exception.message;
      code = exception.name;
    } else {
      message = 'Unknown exception';
    }

    const responseDTO = new ResponseDTO({
      success: false,
      message,
      status,
      error: {
        code,
        details,
      },
    });

    response.status(status).json(responseDTO);
  }
}
