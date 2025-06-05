import { getErrorStack } from '@/common/utils/logging.utils';
import { isValidHttpUrl } from '@/common/utils/url.utils';
import { AppConfigService } from '@/config/app-config.service';
import { BookmarkInsertDto, Collection, User } from '@/db/schema';
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
  parseNetscapeBookmarksStreaming,
  topologicalSortCollections,
} from 'src/modules/bookmark-import/bookmark-import.utils';
import { BookmarkRepository } from '../bookmark/bookmark.repository';
import { CollectionRepository } from '../collection/collection.repository';
import {
  BookmarkItemNode,
  BookmarkTreeNode,
  BookmarkValidationResult,
  CollectionCreationResult,
  ImportConfig,
  ImportResult,
} from './bookmark-import.types';

@Injectable()
export class BookmarkImportService {
  private readonly config: ImportConfig;

  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly bookmarkRepository: BookmarkRepository,
    @InjectQueue(BOOKMARK_METADATA_QUEUE_NAME)
    private readonly metadataQueue: Queue<FetchBookmarkMetadataJob>,
    private readonly importProgressService: BookmarkImportProgressService,
    private readonly logger: LoggerService,
    private readonly appConfigService: AppConfigService
  ) {
    this.config = {
      batchSize: this.appConfigService.get('BOOKMARK_IMPORT_BATCH_SIZE', 100),
      bookmarkChunkSize: this.appConfigService.get('BOOKMARK_CHUCK_SIZE', 1000),
      maxRetries: this.appConfigService.get('BOOKMARK_IMPORT_MAX_RETRIES', 3),
      timeoutMs: this.appConfigService.get(
        'BOOKMARK_IMPORT_TIMEOUT_MS',
        300000
      ),
    };
  }

  @Transactional()
  async parseAndSaveBookmarks({
    html,
    userId,
    job,
  }: {
    html: string;
    userId: User['id'];
    job: JobWithId<ImportBookmarkJob>;
  }): Promise<ImportResult> {
    const startTime = Date.now();

    try {
      this.logInfo('Starting bookmark import', { jobId: job.id, userId });

      // Input validation
      this.validateInputs(html, userId, job);

      // Parse bookmarks with timeout protection
      const parsedResults = await this.parseBookmarksWithTimeout(html);

      const collections = this.extractCollections(parsedResults);
      const bookmarks = this.extractBookmarks(parsedResults);

      this.logInfo('Parsed bookmark file', {
        collectionsCount: collections.length,
        bookmarksCount: bookmarks.length,
      });

      // Process collections first (they're dependencies for bookmarks)
      const collectionResult = await this.processCollections(
        collections,
        userId
      );

      // Validate and filter bookmarks
      const validationResult = await this.validateBookmarks(bookmarks);

      // Process bookmarks
      const createdBookmarks = await this.processBookmarks({
        validBookmarks: validationResult.validBookmarks,
        collectionMap: collectionResult.collectionMap,
        userId,
      });

      // Set up progress tracking
      await this.setupProgressTracking(
        job.id,
        validationResult.validBookmarks.length
      );

      // Queue metadata jobs
      await this.queueMetadataJobs(
        validationResult.validBookmarks,
        createdBookmarks,
        userId,
        job.id
      );

      const result: ImportResult = {
        collectionsCreated: collectionResult.totalCreated,
        bookmarksCreated: createdBookmarks.length,
        bookmarksSkipped: validationResult.skippedCount,
        durationMs: Date.now() - startTime,
      };

      this.logInfo('Finished import successfully', { ...result });
      return result;
    } catch (error) {
      const errorDetails = {
        jobId: job.id,
        userId,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.logError('Failed to import bookmarks', error, errorDetails);
      throw error; // Re-throw to maintain existing error handling behavior
    }
  }

  private createBookmarkDtos({
    bookmarks,
    collectionMap,
    userId,
  }: {
    bookmarks: BookmarkItemNode[];
    collectionMap: Map<string, Collection['id']>;
    userId: User['id'];
  }): BookmarkInsertDto[] {
    return bookmarks.map((bookmark) => ({
      isMetadataPending: false,
      title: ensureBookmarkTitleLength(bookmark.title),
      userId,
      url: bookmark.url,
      collectionId: bookmark.parentId
        ? collectionMap.get(bookmark.parentId) || null
        : null,
    }));
  }

  private createMetadataJobs({
    bookmarks,
    createdBookmarks,
    parentJobId,
    startIndex,
    totalCount,
    userId,
  }: {
    bookmarks: BookmarkItemNode[];
    createdBookmarks: Awaited<ReturnType<BookmarkRepository['bulkCreate']>>;
    userId: User['id'];
    parentJobId: string;
    startIndex: number;
    totalCount: number;
  }) {
    return bookmarks.map((bookmark, index) => {
      const created = createdBookmarks[index];
      if (!created?.id) {
        throw new Error(
          `Missing ID for created bookmark at index ${startIndex + index}`
        );
      }

      return {
        name: BOOKMARK_METADATA_QUEUE_NAME,
        data: {
          type: 'bulk' as const,
          bookmarkId: created.id,
          userId,
          url: bookmark.url,
          onlyFavicon: true,
          currentIndex: startIndex + index,
          totalCount,
          parentJobId,
        },
        opts: {
          removeOnComplete: true,
          removeOnFail: true,
        },
      };
    });
  }

  private extractCollections(nodes: BookmarkTreeNode[]): BookmarkTreeNode[] {
    return nodes.filter(
      (node): node is BookmarkTreeNode => node.type === 'folder'
    );
  }

  private async parseBookmarksWithTimeout(
    html: string
  ): Promise<BookmarkTreeNode[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Bookmark parsing timed out after ${this.config.timeoutMs}ms`
          )
        );
      }, this.config.timeoutMs);

      try {
        const result = parseNetscapeBookmarksStreaming(html);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private extractBookmarks(nodes: BookmarkTreeNode[]): BookmarkItemNode[] {
    return nodes.filter(
      (node): node is BookmarkItemNode => node.type === 'bookmark'
    );
  }

  private validateInputs(
    html: string,
    userId: User['id'],
    job: JobWithId<ImportBookmarkJob>
  ): void {
    if (!html?.trim()) {
      throw new Error('HTML content is required and cannot be empty');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!job?.id) {
      throw new Error('Job ID is required');
    }
  }

  private async processCollections(
    collections: BookmarkTreeNode[],
    userId: User['id']
  ): Promise<CollectionCreationResult> {
    if (collections.length === 0) {
      return { collectionMap: new Map(), totalCreated: 0 };
    }

    const sortedCollections = topologicalSortCollections(collections);
    const collectionMap = new Map<string, Collection['id']>();
    const pendingCollections = new Set(sortedCollections);
    let totalCreated = 0;

    const readyQueue: BookmarkTreeNode[] = [];
    const canInsert = (collection: BookmarkTreeNode) =>
      !collection.parentId || collectionMap.has(collection.parentId);

    // Process collections in dependency order
    while (pendingCollections.size > 0) {
      readyQueue.length = 0;

      // Find collections ready for insertion
      for (const collection of pendingCollections) {
        if (canInsert(collection)) {
          readyQueue.push(collection);
          if (readyQueue.length >= this.config.batchSize) break;
        }
      }

      if (readyQueue.length === 0) {
        throw new Error('Circular or orphaned collection references detected');
      }

      // Bulk insert ready collections
      const insertedCollections = await this.insertCollectionBatch(
        readyQueue,
        userId,
        collectionMap
      );

      // Update tracking
      readyQueue.forEach((collection, index) => {
        const inserted = insertedCollections[index];
        if (inserted?.id) {
          collectionMap.set(collection.tempId, inserted.id);
          pendingCollections.delete(collection);
          totalCreated++;
        }
      });

      this.logInfo('Inserted collection batch', { count: readyQueue.length });
    }

    return { collectionMap, totalCreated };
  }

  private async insertCollectionBatch(
    collections: BookmarkTreeNode[],
    userId: User['id'],
    collectionMap: Map<string, Collection['id']>
  ) {
    const collectionDtos = collections.map((collection, index) => ({
      name: collection.title,
      userId,
      parentId: collection.parentId
        ? collectionMap.get(collection.parentId) || null
        : null,
      // TODO: Check if this really makes sense
      displayOrder: index + 1,
    }));

    return await this.collectionRepository.bulkCreate(collectionDtos);
  }

  private async validateBookmarks(
    bookmarks: BookmarkItemNode[]
  ): Promise<BookmarkValidationResult> {
    const validBookmarks: BookmarkItemNode[] = [];
    let skippedCount = 0;

    // Process bookmarks in chunks to avoid memory issues
    for (let i = 0; i < bookmarks.length; i += this.config.bookmarkChunkSize) {
      const chunk = bookmarks.slice(i, i + this.config.bookmarkChunkSize);

      for (const bookmark of chunk) {
        if (!this.isValidBookmark(bookmark)) {
          skippedCount++;
          continue;
        }
        validBookmarks.push(bookmark);
      }

      // Yield control periodically for long-running operations
      if (i % (this.config.bookmarkChunkSize * 5) === 0) {
        await this.sleep(0); // Yield to event loop
      }
    }

    this.logInfo('Bookmark validation completed', {
      total: bookmarks.length,
      valid: validBookmarks.length,
      skipped: skippedCount,
    });

    return { validBookmarks, skippedCount };
  }

  private isValidBookmark(bookmark: BookmarkItemNode): boolean {
    return !!(
      bookmark.url &&
      isValidHttpUrl(bookmark.url) &&
      bookmark.title?.trim()
    );
  }

  private async processBookmarks({
    validBookmarks,
    collectionMap,
    userId,
  }: {
    validBookmarks: BookmarkItemNode[];
    collectionMap: Map<string, Collection['id']>;
    userId: User['id'];
  }) {
    const createdBookmarks: Awaited<
      ReturnType<typeof this.bookmarkRepository.bulkCreate>
    > = [];

    for (let i = 0; i < validBookmarks.length; i += this.config.batchSize) {
      const chunk = validBookmarks.slice(i, i + this.config.batchSize);
      const bookmarkDtos = this.createBookmarkDtos({
        bookmarks: chunk,
        collectionMap: collectionMap,
        userId,
      });

      const insertedChunk =
        await this.bookmarkRepository.bulkCreate(bookmarkDtos);
      createdBookmarks.push(...insertedChunk);

      this.logInfo('Inserted bookmark batch', {
        batchNumber: Math.floor(i / this.config.batchSize) + 1,
        count: insertedChunk.length,
      });
    }

    // Validate that all bookmarks were created successfully
    if (createdBookmarks.length !== validBookmarks.length) {
      throw new Error(
        `Mismatch between parsed and created bookmarks: expected ${validBookmarks.length}, created ${createdBookmarks.length}`
      );
    }

    return createdBookmarks;
  }

  private async setupProgressTracking(
    jobId: string,
    totalCount: number
  ): Promise<void> {
    await this.importProgressService.setTotalProgress(jobId, totalCount);
  }

  private async queueMetadataJobs(
    validBookmarks: BookmarkItemNode[],
    createdBookmarks: Awaited<
      ReturnType<typeof this.bookmarkRepository.bulkCreate>
    >,
    userId: User['id'],
    jobId: string
  ): Promise<void> {
    for (let i = 0; i < validBookmarks.length; i += this.config.batchSize) {
      const chunk = validBookmarks.slice(i, i + this.config.batchSize);
      const chunkCreated = createdBookmarks.slice(i, i + this.config.batchSize);

      const jobs = this.createMetadataJobs({
        bookmarks: chunk,
        createdBookmarks: chunkCreated,
        userId,
        parentJobId: jobId,
        startIndex: i,
        totalCount: validBookmarks.length,
      });
      await this.metadataQueue.addBulk(jobs);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private logInfo(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.log(message, {
      context: BookmarkImportService.name,
      meta,
    });
  }

  private logError(
    message: string,
    error: unknown,
    meta: Record<string, unknown> = {}
  ): void {
    this.logger.error(message, {
      trace: getErrorStack(error),
      context: BookmarkImportService.name,
      meta,
    });
  }
}
