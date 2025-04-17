import { WorkerHost, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkRepository } from 'src/modules/bookmark/bookmark.repository';
import metascraper from 'metascraper';
import metascraperTitle from 'metascraper-title';
import metascraperDescription from 'metascraper-description';
import { FetchBookmarkMetadataJob } from 'src/common/processors/processors.types';
import { BookmarkGateway } from 'src/modules/bookmark/bookmark.gateway';
import { HttpStatus, Logger, OnModuleDestroy } from '@nestjs/common';

const scraper = metascraper([metascraperTitle(), metascraperDescription()]);

@Processor(BOOKMARK_METADATA_QUEUE_NAME)
export class BookmarkMetadataProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(BookmarkMetadataProcessor.name);

  constructor(
    private readonly bookmarkGateway: BookmarkGateway,
    private readonly bookmarkRepository: BookmarkRepository
  ) {
    super();
  }

  async process(job: Job<FetchBookmarkMetadataJob>): Promise<void> {
    this.logger.log('process job', JSON.stringify(job));

    const { url, bookmarkId, userId } = job.data;

    try {
      const { default: ky } = await import('ky-universal');

      const html = await ky(url, {
        timeout: 10_000,
        retry: {
          limit: 3,
          methods: ['get'],
          statusCodes: [
            HttpStatus.REQUEST_TIMEOUT,
            HttpStatus.PAYLOAD_TOO_LARGE,
            HttpStatus.TOO_MANY_REQUESTS,
            HttpStatus.INTERNAL_SERVER_ERROR,
            HttpStatus.BAD_GATEWAY,
            HttpStatus.SERVICE_UNAVAILABLE,
            HttpStatus.GATEWAY_TIMEOUT,
          ],
          backoffLimit: 3_000,
        },
      }).text();

      const metadata = await scraper({
        html,
        url,
      });

      const updates = {
        title: metadata.title || 'Untitled',
        isMetadataPending: false,
        // description: metadata.description || null,
      };

      await this.bookmarkRepository.updateByIdAndUserId({
        bookmarkId,
        userId,
        updates,
      });

      this.bookmarkGateway.notifyBookmarkUpdate(bookmarkId, updates);
    } catch (error) {
      this.logger.error(`Failed to fetch metadata for URL: ${url}`, error);

      const updates = {
        isMetadataPending: false,
        title: 'Metadata fetch failed',
      };
      await this.bookmarkRepository.updateByIdAndUserId({
        bookmarkId,
        userId,
        updates,
      });
      this.bookmarkGateway.notifyBookmarkUpdate(bookmarkId, updates);
    }
  }

  onModuleDestroy() {
    this.worker.close();
  }
}
