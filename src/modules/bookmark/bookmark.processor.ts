import { getErrorStack } from '@/common/utils/logging.utils';
import { BookmarkImportProgressService } from '@/modules/bookmark-import-progress/bookmark-import-progress.service';
import { LoggerService } from '@/modules/logging/logger.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bullmq';
import { FetchBookmarkMetadataJob } from 'src/common/processors/processors.types';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkGateway } from 'src/modules/bookmark/bookmark.gateway';
import { BookmarkRepository } from 'src/modules/bookmark/bookmark.repository';
import { FaviconService } from 'src/modules/favicon/favicon.service';
import { HtmlFetcherService } from 'src/modules/htmlFetcher/html-fetcher.service';
import { ensureBookmarkTitleLength } from './bookmark.utils';

@Processor(BOOKMARK_METADATA_QUEUE_NAME, {
  concurrency: 10,
})
export class BookmarkMetadataProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  constructor(
    private readonly bookmarkGateway: BookmarkGateway,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly htmlFetcherService: HtmlFetcherService,
    private readonly importProgressService: BookmarkImportProgressService,
    private readonly faviconService: FaviconService,
    private readonly logger: LoggerService
  ) {
    super();
  }

  async process(job: Job<FetchBookmarkMetadataJob>): Promise<void> {
    this.log('Processing job', {
      job,
    });

    const start = Date.now();

    try {
      const metadata = await this.htmlFetcherService.fetchHeadMetadataWithRetry(
        job.data.url
      );

      const updates = {
        ...(job.data?.onlyFavicon
          ? {
              faviconUrl: metadata?.favicon
                ? (
                    await this.faviconService.storeFaviconFromUrl(
                      metadata.favicon
                    )
                  ).url
                : null,
            }
          : {
              title: metadata.title
                ? ensureBookmarkTitleLength(metadata.title)
                : 'Untitled',
              faviconUrl: metadata?.favicon
                ? (
                    await this.faviconService.storeFaviconFromUrl(
                      metadata.favicon
                    )
                  ).url
                : null,
            }),
        isMetadataPending: false,
      };

      await this.bookmarkRepository.updateByIdAndUserId({
        bookmarkId: job.data.bookmarkId,
        userId: job.data.userId,
        updates,
      });

      this.bookmarkGateway.notifyBookmarkUpdate({
        userId: job.data.userId,
        bookmarkId: job.data.bookmarkId,
        metadata: updates,
      });

      await this.emitProgressIfBulkJob(job);
    } catch (error) {
      this.log('Failed to fetch metadata', {
        trace: getErrorStack(error),
        level: 'error',
        job,
      });

      const updates = {
        isMetadataPending: false,
        title: 'Metadata fetch failed',
        faviconUrl: null,
      };

      await this.bookmarkRepository.updateByIdAndUserId({
        bookmarkId: job.data.bookmarkId,
        userId: job.data.userId,
        updates,
      });

      this.bookmarkGateway.notifyBookmarkUpdate({
        userId: job.data.userId,
        bookmarkId: job.data.bookmarkId,
        metadata: updates,
      });

      await this.emitProgressIfBulkJob(job);

      this.log(`Metadata update failed, fallback metadata set`, {
        level: 'warn',
        job,
      });
    } finally {
      const duration = Date.now() - start;
      this.log(`Finished processing in ${duration}ms`, {
        job,
      });
    }
  }

  private async emitProgressIfBulkJob(
    job: Job<FetchBookmarkMetadataJob>
  ): Promise<void> {
    if (job.data.type === 'bulk' && job.data.parentJobId) {
      await this.importProgressService.incrementProgress(job.data.parentJobId);
      const progress = await this.importProgressService.getProgress(
        job.data.parentJobId
      );

      this.bookmarkGateway.emitImportProgress(job.data.userId, {
        importJobId: job.data.parentJobId,
        progress,
        status: progress === 100 ? 'completed' : 'processing',
      });

      if (progress === 100) {
        await this.importProgressService.cleanupProgress(job.data.parentJobId);
      }
    }
  }

  private log(
    message: string,
    {
      level = 'log',
      meta = {},
      trace,
      job,
    }: {
      level?: 'log' | 'warn' | 'error' | 'debug';
      meta?: Record<string, unknown>;
      trace?: string;
      job: Job<FetchBookmarkMetadataJob>;
    }
  ) {
    const baseMeta = {
      jobId: job?.id,
      bookmarkId: job?.data?.bookmarkId,
      userId: job?.data?.userId,
      url: job?.data?.url,
    };

    const context = BookmarkMetadataProcessor.name;

    const mergedMeta = { ...baseMeta, ...meta };

    if (level === 'error') {
      this.logger.error(message, {
        context,
        meta: mergedMeta,
        trace,
      });
    } else {
      this.logger[level](message, {
        context,
        meta: mergedMeta,
      });
    }
  }

  onModuleDestroy() {
    this.worker.close();
  }
}
