import { getErrorStack } from '@/common/utils/logging.utils';
import { Collection, User } from '@/db/schema';
import { BookmarkImportProgressService } from '@/modules/bookmark-import-progress/bookmark-import-progress.service';
import { LoggerService } from '@/modules/logging/logger.service';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  FetchBookmarkMetadataJob,
  ImportBookmarkJob,
} from 'src/common/processors/processors.types';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { parseNetscapeBookmarks } from 'src/modules/bookmark-import/bookmark-import.utils';
import { BookmarkRepository } from '../bookmark/bookmark.repository';
import { truncateBookmarkTitle } from '../bookmark/bookmark.utils';
import { CollectionRepository } from '../collection/collection.repository';
import { generateRandomHexColor } from '../collection/collection.utils';

@Injectable()
export class BookmarkImportService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly bookmarkRepository: BookmarkRepository,
    @InjectQueue(BOOKMARK_METADATA_QUEUE_NAME)
    private readonly metadataQueue: Queue<FetchBookmarkMetadataJob>,
    private readonly importProgressService: BookmarkImportProgressService,
    private readonly logger: LoggerService
  ) {}

  @Transactional()
  async parseAndSaveBookmarks({
    html,
    userId,
    job,
  }: {
    html: string;
    userId: User['id'];
    job: Job<ImportBookmarkJob>;
  }) {
    const start = Date.now();

    try {
      this.log('Starting bookmark import', {
        meta: { jobId: job.id, userId },
      });

      const bookmarks = parseNetscapeBookmarks(html);

      this.log('Parsed bookmarks', {
        meta: { count: bookmarks.length },
      });

      const collectionNameToId = new Map<string, Collection['id']>();
      const uniqueCategories = [
        ...new Set(
          bookmarks
            .map((bookmark) => bookmark.category)
            .filter((category) => category !== null)
        ),
      ];

      const insertedCategories = await this.collectionRepository.bulkCreate(
        uniqueCategories.map((category) => ({
          name: category,
          userId,
          color: generateRandomHexColor(),
        }))
      );

      this.log('Inserted collections', {
        meta: { count: insertedCategories.length },
      });

      for (const category of insertedCategories) {
        collectionNameToId.set(category.name, category.id);
      }

      const createdIds = await this.bookmarkRepository.bulkCreate(
        bookmarks.map((bookmark) => ({
          isMetadataPending: false,
          title: truncateBookmarkTitle(bookmark.title),
          userId,
          url: bookmark.url,
          collectionId: bookmark.category
            ? collectionNameToId.get(bookmark.category)
            : null,
        }))
      );

      this.log('Bookmarks created', {
        meta: { count: createdIds.length },
      });

      await this.importProgressService.setTotalProgress(
        job.id as string,
        bookmarks.length
      );

      // FIXME: Clean up as assertions
      this.metadataQueue.addBulk(
        bookmarks.map((bookmark, index) => ({
          name: BOOKMARK_METADATA_QUEUE_NAME,
          data: {
            type: 'bulk',
            bookmarkId: createdIds[index]?.id as string,
            userId,
            url: bookmark.url,
            onlyFavicon: true,
            currentIndex: index,
            totalCount: bookmarks.length,
            parentJobId: job.id as string,
          },
          opts: {
            removeOnComplete: true,
            removeOnFail: true,
          },
        }))
      );

      this.log('Scheduled metadata jobs', {
        meta: { totalJobs: bookmarks.length },
      });

      this.log('Finished import successfully', {
        meta: { durationMs: Date.now() - start },
      });
    } catch (error) {
      this.log('Failed to import bookmarks', {
        level: 'error',
        trace: getErrorStack(error),
        meta: { jobId: job.id, userId },
      });
    }
  }

  private log(
    message: string,
    {
      level = 'log',
      meta = {},
      trace,
    }: {
      level?: 'log' | 'warn' | 'error' | 'debug';
      meta?: Record<string, unknown>;
      trace?: string;
    }
  ) {
    const context = BookmarkImportService.name;

    if (level === 'error') {
      this.logger.error(message, {
        trace,
        context,
      });
    } else {
      this.logger[level](message, { context, meta });
    }
  }
}
