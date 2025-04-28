import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bullmq';
import { ImportBookmarkJob } from 'src/common/processors/processors.types';
import { BOOKMARK_IMPORT_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkImportService } from './bookmark-import.service';

@Processor(BOOKMARK_IMPORT_QUEUE_NAME)
export class BookmarkImportQueueProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(BookmarkImportQueueProcessor.name);

  constructor(private readonly bookmarkImportService: BookmarkImportService) {
    super();
  }

  async process(job: Job<ImportBookmarkJob>): Promise<void> {
    const { userId, html } = job.data;
    const jobId = job.id;

    this.logger.log(
      `[Job ${jobId}] Starting ImportBookmarkJob for userId=${userId}`
    );

    return this.bookmarkImportService.parseAndSaveBookmarks(html, userId, job);
  }

  onModuleDestroy() {
    this.worker.close();
  }
}
