import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  FetchBookmarkMetadataJob,
  ImportBookmarkJob,
} from 'src/common/processors/processors.types';
import { CollectionRepository } from '../collection/collection.repository';
import { BookmarkRepository } from '../bookmark/bookmark.repository';
import { truncateBookmarkTitle } from '../bookmark/bookmark.utils';
import { generateRandomHexColor } from '../collection/collection.utils';
import { Transactional } from '@nestjs-cls/transactional';
import { parseNetscapeBookmarks } from 'src/modules/bookmark-import/bookmark-import.utils';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { InjectQueue } from '@nestjs/bullmq';
import { BookmarkImportProgressService } from 'src/modules/bookmark-import/bookmark-import-progress.service';

@Injectable()
export class BookmarkImportService {
  private readonly logger = new Logger(BookmarkImportService.name);

  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly bookmarkRepository: BookmarkRepository,
    @InjectQueue(BOOKMARK_METADATA_QUEUE_NAME)
    private readonly metadataQueue: Queue<FetchBookmarkMetadataJob>,
    private readonly importProgressService: BookmarkImportProgressService
  ) {}

  @Transactional()
  async parseAndSaveBookmarks(
    html: string,
    userId: number,
    job: Job<ImportBookmarkJob>
  ) {
    try {
      this.logger.log(
        `Parse and save bookmarks for [Job ${job.id}] and [User ${userId}]`
      );

      const bookmarks = parseNetscapeBookmarks(html);

      const collectionNameToId = new Map<string, number>();
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

      await this.importProgressService.setTotalProgress(
        job.id as string,
        bookmarks.length
      );

      this.metadataQueue.addBulk(
        bookmarks.map((bookmark, index) => ({
          name: BOOKMARK_METADATA_QUEUE_NAME,
          data: {
            type: 'bulk',
            bookmarkId: createdIds[index]?.id as number,
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
    } catch (error) {
      this.logger.error(
        `Bookmark import error ${(error as Error).message}`,
        (error as Error).stack
      );
    }
  }
}
