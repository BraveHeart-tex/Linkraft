import { getErrorStack } from '@/common/utils/logging.utils';
import { isValidHttpUrl } from '@/common/utils/url.utils';
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
  BookmarkItemNode,
  BookmarkTreeNode,
  parseNetscapeBookmarksStreaming,
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

      const parsedResults = parseNetscapeBookmarksStreaming(html);

      const collections = parsedResults.filter(
        (node) => node.type === 'folder'
      );
      const sortedCollections = topologicalSortCollections(collections);

      const bookmarks = parsedResults.filter(
        (node) => node.type === 'bookmark'
      );

      const collectionMap = new Map<string, Collection['id']>();

      const BATCH_SIZE = 100;
      const pendingCollections = new Set(sortedCollections);

      const readyQueue: BookmarkTreeNode[] = [];

      const canInsert = (collection: BookmarkTreeNode) =>
        !collection.parentId || collectionMap.has(collection.parentId);

      while (pendingCollections.size > 0) {
        readyQueue.length = 0;

        for (const collection of pendingCollections) {
          if (canInsert(collection)) {
            readyQueue.push(collection);
            if (readyQueue.length >= BATCH_SIZE) break;
          }
        }

        if (readyQueue.length === 0) {
          throw new Error(
            'Circular or orphaned collection references detected'
          );
        }

        const inserted = await this.collectionRepository.bulkCreate(
          readyQueue.map((collection) => ({
            name: collection.title,
            userId,
            parentId: collection.parentId
              ? collectionMap.get(collection.parentId)
              : null,
          }))
        );

        readyQueue.forEach((collection, index) => {
          if (inserted[index]?.id) {
            collectionMap.set(collection.tempId, inserted[index].id);
            pendingCollections.delete(collection);
          }
        });

        this.log('Inserted collection batch', {
          meta: { count: readyQueue.length },
        });
      }

      const BOOKMARK_CHUNK_SIZE = 1000;
      const validBookmarks: BookmarkItemNode[] = [];
      for (let i = 0; i < bookmarks.length; i += BOOKMARK_CHUNK_SIZE) {
        const chunk = bookmarks.slice(i, i + BOOKMARK_CHUNK_SIZE);
        for (const bookmark of chunk) {
          if (!isValidHttpUrl(bookmark.url)) continue;
          validBookmarks.push(bookmark);
        }

        // Optional: yield control (in real async env) or do small pause here if needed
      }

      const createdBookmarks: Awaited<
        ReturnType<typeof this.bookmarkRepository.bulkCreate>
      > = [];

      for (let i = 0; i < validBookmarks.length; i += BATCH_SIZE) {
        const chunk = validBookmarks.slice(i, i + BATCH_SIZE);
        const bookmarkDtos = chunk.map((bookmark) => ({
          isMetadataPending: false,
          title: ensureBookmarkTitleLength(bookmark.title),
          userId,
          url: bookmark.url,
          collectionId: bookmark.parentId
            ? collectionMap.get(bookmark.parentId) || null
            : null,
        }));

        const insertedChunk =
          await this.bookmarkRepository.bulkCreate(bookmarkDtos);
        createdBookmarks.push(...insertedChunk);

        this.log('Inserted bookmark batch', {
          meta: { count: insertedChunk.length },
        });
      }

      if (createdBookmarks.length !== validBookmarks.length) {
        throw new Error('Mismatch between parsed and created bookmarks');
      }

      await this.importProgressService.setTotalProgress(
        job.id,
        validBookmarks.length
      );

      this.log('Bookmarks created', {
        meta: { count: createdBookmarks.length },
      });

      await this.importProgressService.setTotalProgress(
        job.id,
        bookmarks.length
      );

      for (let i = 0; i < validBookmarks.length; i += BATCH_SIZE) {
        const chunk = validBookmarks.slice(i, i + BATCH_SIZE);
        const chunkCreated = createdBookmarks.slice(i, i + BATCH_SIZE);

        await this.metadataQueue.addBulk(
          chunk.map((bookmark, index) => {
            const created = chunkCreated[index];
            if (!created?.id) {
              throw new Error(
                `Missing ID for created bookmark at index ${i + index}`
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
                currentIndex: i + index,
                totalCount: validBookmarks.length,
                parentJobId: job.id,
              },
              opts: {
                removeOnComplete: true,
                removeOnFail: true,
              },
            };
          })
        );
      }

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
