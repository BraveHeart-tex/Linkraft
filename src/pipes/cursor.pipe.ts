import { cursorSchema } from '@/common/validation/schemas/shared/cursor.schema';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class CursorPipe implements PipeTransform {
  transform(value: string | undefined) {
    if (!value) return null;

    let decoded: string;

    try {
      const json = Buffer.from(value, 'base64').toString('utf-8');
      decoded = JSON.parse(json);
    } catch {
      throw new BadRequestException('Invalid base64-encoded cursor');
    }

    return cursorSchema.parse(decoded);
  }
}
