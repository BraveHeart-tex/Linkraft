import { InjectQueue } from '@nestjs/bullmq';
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Queue } from 'bullmq';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PARSE_BOOKMARKS_JOB_NAME } from 'src/common/processors/jobNames';
import { ImportBookmarkJob } from 'src/common/processors/processors.types';
import { BOOKMARK_IMPORT_QUEUE_NAME } from 'src/common/processors/queueNames';
import { FileSizeValidationPipe } from 'src/pipes/file-size-validation.pipe';
import { FileTypeValidationPipe } from 'src/pipes/file-type-validation.pipe';
import { UserSessionContext } from '../auth/session.types';

@Controller('import-bookmarks')
export class BookmarkImportController {
  constructor(
    @InjectQueue(BOOKMARK_IMPORT_QUEUE_NAME)
    private readonly bookmarkImportQueue: Queue<ImportBookmarkJob>
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadBookmarkFile(
    @UploadedFile(
      new FileSizeValidationPipe(5 * 1024 * 1024),
      new FileTypeValidationPipe(['text/html'])
    )
    file: Express.Multer.File,
    @CurrentUser() userSessionContext: UserSessionContext
  ): Promise<{ jobId: string }> {
    const html = file.buffer.toString('utf-8');

    const jobId = crypto.randomUUID();

    await this.bookmarkImportQueue.add(
      PARSE_BOOKMARKS_JOB_NAME,
      {
        html,
        userId: userSessionContext.user.id,
      },
      {
        jobId,
      }
    );

    return { jobId };
  }
}
