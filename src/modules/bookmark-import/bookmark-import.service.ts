import { getErrorStack } from '@/common/utils/logging.utils';
import { Collection, User } from '@/db/schema';
import { BookmarkImportProgressService } from '@/modules/bookmark-import-progress/bookmark-import-progress.service';
import { ensureBookmarkTitleLength } from '@/modules/bookmark/bookmark.utils';
import { LoggerService } from '@/modules/logging/logger.service';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  FetchBookmarkMetadataJob,
  ImportBookmarkJob,
  JobWithId,
} from 'src/common/processors/processors.types';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import {
  parseNetscapeBookmarks,
  topologicalSortCollections,
} from 'src/modules/bookmark-import/bookmark-import.utils';
import { BookmarkRepository } from '../bookmark/bookmark.repository';
import { CollectionRepository } from '../collection/collection.repository';

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
    job: JobWithId<ImportBookmarkJob>;
  }) {
    const start = Date.now();

    try {
      this.log('Starting bookmark import', {
        meta: { jobId: job.id, userId },
      });

      const parsedResults = parseNetscapeBookmarks(html);
      const collections = parsedResults.filter(
        (node) => node.type === 'collection'
      );
      const sortedCollections = topologicalSortCollections(collections);

      const bookmarks = parsedResults.filter(
        (node) => node.type === 'bookmark'
      );

      const collectionTempIdToInsertId = new Map<string, Collection['id']>();

      // Collections left to insert:
      let collectionsToInsert = [...sortedCollections];

      while (collectionsToInsert.length > 0) {
        // Find collections ready for insert: parentId null or parent inserted
        const readyToInsert = collectionsToInsert.filter(
          (c) => !c.parentId || collectionTempIdToInsertId.has(c.parentId)
        );

        if (readyToInsert.length === 0) {
          throw new Error('Circular or missing parent references detected');
        }

        // Insert batch
        const insertedBatch = await this.collectionRepository.bulkCreate(
          readyToInsert.map((c) => ({
            name: c.title,
            userId,
            parentId: c.parentId
              ? collectionTempIdToInsertId.get(c.parentId)
              : null,
          }))
        );

        // Update map with inserted IDs
        insertedBatch.forEach((inserted, index) => {
          if (readyToInsert[index]) {
            collectionTempIdToInsertId.set(
              readyToInsert[index].tempId,
              inserted.id
            );
          }
        });

        // Remove inserted collections from collectionsToInsert
        collectionsToInsert = collectionsToInsert.filter(
          (c) => !collectionTempIdToInsertId.has(c.tempId)
        );

        this.log('Inserted collection batch', {
          meta: { count: readyToInsert.length },
        });
      }

      const createdBookmarks = await this.bookmarkRepository.bulkCreate(
        bookmarks.map((bookmark) => ({
          isMetadataPending: false,
          title: ensureBookmarkTitleLength(bookmark.title),
          userId,
          url: bookmark.url,
          collectionId: bookmark.parentId
            ? collectionTempIdToInsertId.get(bookmark.parentId) || null
            : null,
        }))
      );

      if (createdBookmarks.length !== bookmarks.length) {
        throw new Error('Mismatch between parsed and created bookmarks');
      }

      this.log('Bookmarks created', {
        meta: { count: createdBookmarks.length },
      });

      await this.importProgressService.setTotalProgress(
        job.id,
        bookmarks.length
      );

      this.metadataQueue.addBulk(
        bookmarks.map((bookmark, index) => {
          const created = createdBookmarks[index];
          if (!created?.id) {
            throw new Error(
              `Missing ID for created bookmark at index ${index}`
            );
          }

          return {
            name: BOOKMARK_METADATA_QUEUE_NAME,
            data: {
              type: 'bulk',
              bookmarkId: created.id,
              userId,
              url: bookmark.url,
              onlyFavicon: true,
              currentIndex: index,
              totalCount: bookmarks.length,
              parentJobId: job.id,
            },
            opts: {
              removeOnComplete: true,
              removeOnFail: true,
            },
          };
        })
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
