import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bullmq';
import { FetchBookmarkMetadataJob } from 'src/common/processors/processors.types';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkImportProgressService } from 'src/modules/bookmark-import/bookmark-import-progress.service';
import { BookmarkGateway } from 'src/modules/bookmark/bookmark.gateway';
import { BookmarkRepository } from 'src/modules/bookmark/bookmark.repository';
import { FaviconService } from 'src/modules/favicon/favicon.service';
import { HtmlFetcherService } from 'src/modules/htmlFetcher/html-fetcher.service';
import { truncateBookmarkTitle } from './bookmark.utils';

@Processor(BOOKMARK_METADATA_QUEUE_NAME, {
  concurrency: 10,
})
export class BookmarkMetadataProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(BookmarkMetadataProcessor.name);

  constructor(
    private readonly bookmarkGateway: BookmarkGateway,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly htmlFetcherService: HtmlFetcherService,
    private readonly importProgressService: BookmarkImportProgressService,
    private readonly faviconService: FaviconService
  ) {
    super();
  }

  async process(job: Job<FetchBookmarkMetadataJob>): Promise<void> {
    const start = Date.now();

    this.logger.log(
      `[Job ${job.id}] Starting FetchBookmarkMetadataJob for bookmarkId=${job.data.bookmarkId}, userId=${job.data.userId}, url=${job.data.url}`
    );

    try {
      const start = Date.now();
      const metadata = await this.htmlFetcherService.fetchHeadMetadataWithRetry(
        job.data.url
      );

      this.logger.debug(`Took ${Date.now() - start}ms`);

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
                ? truncateBookmarkTitle(metadata.title)
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

      if (job.data.type === 'bulk' && job.data.parentJobId) {
        await this.importProgressService.incrementProgress(
          job.data.parentJobId
        );
        const progress = await this.importProgressService.getProgress(
          job.data.parentJobId
        );

        this.bookmarkGateway.emitImportProgress(job.data.userId, {
          importJobId: job.data.parentJobId,
          progress,
          status: progress === 100 ? 'completed' : 'processing',
        });

        if (progress === 100) {
          await this.importProgressService.cleanupProgress(
            job.data.parentJobId
          );
        }
      }

      this.logger.log(`[Job ${job.id}] Successfully updated bookmark metadata`);
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Failed to fetch metadata for bookmarkId=${job.data.bookmarkId}, userId=${job.data.userId}, url=${job.data.url}`,
        (error as Error).stack
      );

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

      this.logger.warn(
        `[Job ${job.id}] Metadata update failed, fallback metadata set`
      );
    } finally {
      const duration = Date.now() - start;
      this.logger.log(`[Job ${job.id}] Finished processing in ${duration}ms`);
    }
  }

  onModuleDestroy() {
    this.worker.close();
  }
}
