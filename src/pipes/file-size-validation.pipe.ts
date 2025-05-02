import {
  Injectable,
  PipeTransform,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';

interface FileWithSize extends Express.Multer.File {
  size: number;
}

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  constructor(private readonly maxSize: number) {}

  transform(file: FileWithSize) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > this.maxSize) {
      throw new PayloadTooLargeException(
        `File size exceeds the limit of ${this.maxSize / 1024 / 1024} MB`
      );
    }

    return file;
  }
}
