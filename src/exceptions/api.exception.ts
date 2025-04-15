import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    details?: Record<string, string | unknown>
  ) {
    super(
      {
        success: false,
        data: null,
        message,
        error: { code, details },
      },
      status
    );
  }
}
