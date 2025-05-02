import { WorkerHost, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkRepository } from 'src/modules/bookmark/bookmark.repository';
import { FetchBookmarkMetadataJob } from 'src/common/processors/processors.types';
import { BookmarkGateway } from 'src/modules/bookmark/bookmark.gateway';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import metascraper from 'metascraper';
import metascraperTitle from 'metascraper-title';
import metascraperDescription from 'metascraper-description';
import metascraperLogoFavicon from 'metascraper-logo-favicon';
import { MetadataService } from 'src/modules/metadata/metadata.service';
import { truncateBookmarkTitle } from './bookmark.utils';

@Processor(BOOKMARK_METADATA_QUEUE_NAME, {
  concurrency: 10,
})
export class BookmarkMetadataProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(BookmarkMetadataProcessor.name);
  private scraper = metascraper([
    metascraperTitle(),
    metascraperDescription(),
    metascraperLogoFavicon(),
  ]);

  constructor(
    private readonly bookmarkGateway: BookmarkGateway,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly metadataService: MetadataService
  ) {
    super();
  }

  async process(job: Job<FetchBookmarkMetadataJob>): Promise<void> {
    const start = Date.now();

    this.logger.log(
      `[Job ${job.id}] Starting FetchBookmarkMetadataJob for bookmarkId=${job.data.bookmarkId}, userId=${job.data.userId}, url=${job.data.url}`
    );

    try {
      const { html } = await this.metadataService.fetchHtml(job.data.url);
      this.logger.debug(
        `[Job ${job.id}] Fetched HTML for URL: ${job.data.url}`
      );

      const metadata = await this.scraper({ html, url: job.data.url });
      this.logger.debug(
        `[Job ${job.id}] Extracted metadata: ${JSON.stringify(metadata)}`
      );

      const updates = {
        ...(job.data?.onlyFavicon
          ? {
              faviconUrl: metadata?.logo || null,
            }
          : {
              title: metadata.title
                ? truncateBookmarkTitle(metadata.title)
                : 'Untitled',
              faviconUrl: metadata?.logo || null,
            }),
        isMetadataPending: false,
      };

      await this.bookmarkRepository.updateByIdAndUserId({
        bookmarkId: job.data.bookmarkId,
        userId: job.data.userId,
        updates,
      });

      this.bookmarkGateway.notifyBookmarkUpdate(job.data.bookmarkId, updates);

      if (job.data.type === 'bulk' && job.id) {
        // FIXME: Jobs are not guaranteed to be in order, so we need to handle this case
        const progress = Math.round(
          ((job.data.currentIndex + 1) / job.data.totalCount) * 100
        );

        this.bookmarkGateway.emitImportProgress(job.data.parentJobId, {
          progress,
          status: progress === 100 ? 'completed' : 'processing',
        });
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
      this.bookmarkGateway.notifyBookmarkUpdate(job.data.bookmarkId, updates);

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
