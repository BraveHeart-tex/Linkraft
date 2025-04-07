import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
  constructor(private reflector: Reflector) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ResponseDTO<T>> {
    return next.handle().pipe(
      map((data) => {
        console.log('data', data);
        return new ResponseDTO({
          success: true,
          message:
            this.reflector.get<string>(
              'response_message',
              context.getHandler()
            ) || '',
          data: data || null,
          error: null,
          status: null,
        });
      })
    );
  }
}
