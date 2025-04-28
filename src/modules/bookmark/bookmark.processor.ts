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

@Processor(BOOKMARK_METADATA_QUEUE_NAME)
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
    const { url, bookmarkId, userId } = job.data;
    const jobId = job.id;
    const start = Date.now();

    this.logger.log(
      `[Job ${jobId}] Starting FetchBookmarkMetadataJob for bookmarkId=${bookmarkId}, userId=${userId}, url=${url}`
    );

    try {
      const { html } = await this.metadataService.fetchHtml(url);
      this.logger.debug(`[Job ${jobId}] Fetched HTML for URL: ${url}`);

      const metadata = await this.scraper({ html, url });
      this.logger.debug(
        `[Job ${jobId}] Extracted metadata: ${JSON.stringify(metadata)}`
      );

      const updates = {
        title: metadata.title
          ? truncateBookmarkTitle(metadata.title)
          : 'Untitled',
        isMetadataPending: false,
        faviconUrl: metadata?.logo || null,
      };

      await this.bookmarkRepository.updateByIdAndUserId({
        bookmarkId,
        userId,
        updates,
      });
      this.bookmarkGateway.notifyBookmarkUpdate(bookmarkId, updates);

      this.logger.log(`[Job ${jobId}] Successfully updated bookmark metadata`);
    } catch (error) {
      this.logger.error(
        `[Job ${jobId}] Failed to fetch metadata for bookmarkId=${bookmarkId}, userId=${userId}, url=${url}`,
        (error as Error).stack
      );

      const updates = {
        isMetadataPending: false,
        title: 'Metadata fetch failed',
        faviconUrl: null,
      };
      await this.bookmarkRepository.updateByIdAndUserId({
        bookmarkId,
        userId,
        updates,
      });
      this.bookmarkGateway.notifyBookmarkUpdate(bookmarkId, updates);

      this.logger.warn(
        `[Job ${jobId}] Metadata update failed, fallback metadata set`
      );
    } finally {
      const duration = Date.now() - start;
      this.logger.log(`[Job ${jobId}] Finished processing in ${duration}ms`);
    }
  }

  onModuleDestroy() {
    this.worker.close();
  }
}
