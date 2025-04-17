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
import { MetadataService } from 'src/modules/metadata/metadata.service';

@Processor(BOOKMARK_METADATA_QUEUE_NAME)
export class BookmarkMetadataProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(BookmarkMetadataProcessor.name);
  private scraper = metascraper([metascraperTitle(), metascraperDescription()]);

  constructor(
    private readonly bookmarkGateway: BookmarkGateway,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly metadataService: MetadataService
  ) {
    super();
  }

  async process(job: Job<FetchBookmarkMetadataJob>): Promise<void> {
    this.logger.log('process job', JSON.stringify(job));

    const { url, bookmarkId, userId } = job.data;

    try {
      const { html } = await this.metadataService.fetchHtml(url);

      const metadata = await this.scraper({
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
