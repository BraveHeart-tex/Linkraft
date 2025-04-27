import { InjectQueue } from '@nestjs/bullmq';
import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BOOKMARK_IMPORT_QUEUE_NAME } from 'src/common/processors/queueNames';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserSessionContext } from '../auth/session.types';
import { PARSE_BOOKMARKS_JOB_NAME } from 'src/common/processors/jobNames';
import { Queue } from 'bullmq';
import { FileSizeValidationPipe } from 'src/pipes/file-size-validation.pipe';
import { FileTypeValidationPipe } from 'src/pipes/file-type-validation.pipe';
import { AuthGuard } from 'src/guards/auth.guard';
import { ImportBookmarkJob } from 'src/common/processors/processors.types';

@Controller('import-bookmarks')
@UseGuards(AuthGuard)
export class BookmarkImportController {
  constructor(
    @InjectQueue(BOOKMARK_IMPORT_QUEUE_NAME)
    private readonly bookmarkImportQueue: Queue<ImportBookmarkJob>
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadBookmarkFile(
    @UploadedFile(
      new FileSizeValidationPipe(10 * 1024 * 1024), // 10MB
      new FileTypeValidationPipe(['text/html'])
    )
    file: Express.Multer.File,
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
