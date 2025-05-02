import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

interface FileWithType extends Express.Multer.File {
  mimetype: string;
}

@Injectable()
export class FileTypeValidationPipe implements PipeTransform {
  constructor(private readonly allowedTypes: string[]) {}

  transform(file: FileWithType) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`
      );
    }

    return file;
  }
}
