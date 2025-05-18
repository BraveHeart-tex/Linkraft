import { getErrorStack } from '@/common/utils/logging.utils';
import { LoggerService } from '@/modules/logging/logger.service';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseDTO } from 'src/common/response.dto';
import { ApiException } from 'src/exceptions/api.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest();

    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let details: unknown = null;

    if (exception instanceof ApiException) {
      const apiResponse = exception.getResponse() as ResponseDTO<null>;
      message = exception.message;
      status = exception.getStatus();
      details = apiResponse?.error!.details;
    } else if (exception instanceof Error) {
      message = exception.message;
    } else {
      message = 'Unknown exception';
    }

    const responseDTO = new ResponseDTO({
      success: false,
      message,
      status,
      error: {
        details,
      },
    });

    this.logger.error('Unhandled exception occurred', {
      context: GlobalExceptionFilter.name,
      meta: {
        statusCode: status,
        message,
        details,
        path: request.path,
        method: request.method,
      },
      trace: getErrorStack(exception),
    });

    response.status(status).json(responseDTO);
  }
}
