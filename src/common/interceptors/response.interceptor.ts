import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_METADATA_KEY } from '../decorators/response-message.decorator';
import { RESPONSE_STATUS_METADATA_KEY } from '../decorators/response-status.decorator';
import { ResponseDTO } from '../response.dto';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ResponseDTO<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ResponseDTO<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();

    const statusCode =
      this.reflector.get<HttpStatus>(
        RESPONSE_STATUS_METADATA_KEY,
        context.getHandler()
      ) || HttpStatus.OK;

    response.status(statusCode);

    return next.handle().pipe(
      map((data) => {
        return new ResponseDTO({
          success: true,
          message:
            this.reflector.get<string>(
              RESPONSE_MESSAGE_METADATA_KEY,
              context.getHandler()
            ) || '',
          data: data || null,
          error: null,
          status: statusCode,
        });
      })
    );
  }
}
