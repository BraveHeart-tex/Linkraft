export class ResponseDTO<T> {
  success: boolean;

  data: T | null;

  message: string;

  error: {
    code: string;
    details?: unknown;
  } | null;

  constructor(
    success: boolean,
    message: string,
    data: T | null = null,
    error: { code: string; details?: unknown } | null = null
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
  }
}
