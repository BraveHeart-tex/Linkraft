import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseDTO } from 'src/common/response.dto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    const status =
      exception instanceof Error
        ? HttpStatus.INTERNAL_SERVER_ERROR
        : HttpStatus.BAD_REQUEST;

    let message = 'Internal Server Error';
    let code = 'UNKNOWN_ERROR';

    if (exception instanceof Error) {
      message = exception.message;
      code = exception.name;
    } else {
      message = 'Unknown exception';
      code = 'UNKNOWN_ERROR';
    }

    const responseDTO = new ResponseDTO(false, message, null, {
      code,
      details: null,
    });

    response.status(status).json(responseDTO);
  }
}
