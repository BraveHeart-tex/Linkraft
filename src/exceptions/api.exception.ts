import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    details?: Record<string, string | unknown>
  ) {
    super(
      {
        success: false,
        data: null,
        message,
        error: { details },
      },
      status
    );
  }
}
