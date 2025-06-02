import { ImportResult } from '@/modules/bookmark-import/bookmark-import.types';
import { LoggerService } from '@/modules/logging/logger.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleDestroy } from '@nestjs/common';
import {
  ImportBookmarkJob,
  JobWithId,
} from 'src/common/processors/processors.types';
import { BOOKMARK_IMPORT_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkImportService } from './bookmark-import.service';

@Processor(BOOKMARK_IMPORT_QUEUE_NAME)
export class BookmarkImportQueueProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  constructor(
    private readonly bookmarkImportService: BookmarkImportService,
    private readonly logger: LoggerService
  ) {
    super();
  }

  async process(job: JobWithId<ImportBookmarkJob>): Promise<ImportResult> {
    const { userId, html } = job.data;
    const jobId = job.id;
    this.logger.log('Starting ImportBookmarkJob', {
      context: 'BookmarkImportService',
      meta: {
        jobId,
        userId,
        operation: 'ImportBookmarkJob',
        status: 'started',
      },
    });

    return this.bookmarkImportService.parseAndSaveBookmarks({
      html,
      userId,
      job,
    });
  }

  onModuleDestroy() {
    this.worker.close();
  }
}
