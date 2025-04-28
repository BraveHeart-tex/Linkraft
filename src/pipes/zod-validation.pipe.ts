import { HttpStatus, PipeTransform } from '@nestjs/common';
import { ApiException } from 'src/exceptions/api.exception';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const key = err.path.join('.') || 'unknown';
        errors[key] = err.message;
      });
      throw new ApiException(
        'Validation failed',
        HttpStatus.BAD_REQUEST,
        errors
      );
    }
    return result.data;
  }
}
