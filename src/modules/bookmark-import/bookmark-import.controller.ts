import { InjectQueue } from '@nestjs/bullmq';
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { BOOKMARK_IMPORT_QUEUE_NAME } from 'src/common/processors/queueNames';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserSessionContext } from '../auth/session.types';
import { PARSE_BOOKMARKS_JOB_NAME } from 'src/common/processors/jobNames';
import { Queue } from 'bullmq';

@Controller('import-bookmarks')
export class BookmarkImportController {
  constructor(
    @InjectQueue(BOOKMARK_IMPORT_QUEUE_NAME)
    private readonly bookmarkImportQueue: Queue
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadBookmarkFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    const html = file.buffer.toString('utf-8');

    const job = await this.bookmarkImportQueue.add(PARSE_BOOKMARKS_JOB_NAME, {
      html,
      userId: userSessionContext.user.id,
    });

    return { jobId: job.id };
  }
}
