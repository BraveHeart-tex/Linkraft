import { HttpStatus } from '@nestjs/common';

export class ResponseDTO<T> {
  success: boolean;
  data: T | null;
  message: string;
  error: {
    code: string;
    details?: unknown;
  } | null;
  status: HttpStatus;

  constructor({
    success,
    message,
    status,
    data = null,
    error = null,
  }: {
    success: boolean;
    message: string;
    status: HttpStatus;
    data?: T | null;
    error?: { code: string; details?: unknown } | null;
  }) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.status = status;
  }
}
