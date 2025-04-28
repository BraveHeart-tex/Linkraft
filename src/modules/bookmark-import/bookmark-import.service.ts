import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ImportBookmarkJob } from 'src/common/processors/processors.types';
import { parseBookmarksHtml } from './bookmark-import.utils';
import { CollectionRepository } from '../collection/collection.repository';
import { BookmarkRepository } from '../bookmark/bookmark.repository';
import { truncateBookmarkTitle } from '../bookmark/bookmark.utils';

@Injectable()
export class BookmarkImportService {
  private readonly logger = new Logger(BookmarkImportService.name);

  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly bookmarkRepository: BookmarkRepository
  ) {}

  async parseAndSaveBookmarks(
    html: string,
    userId: number,
    job: Job<ImportBookmarkJob>
  ) {
    try {
      this.logger.log(
        `Parse and save bookmarks for [Job ${job.id}] and [User ${userId}]`
      );

      const { bookmarks } = parseBookmarksHtml(html);
      this.logger.log(
        `Bookmarks (${bookmarks.length}): ${JSON.stringify(bookmarks, null, 2)}`
      );

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
        }))
      );

      for (const category of insertedCategories) {
        collectionNameToId.set(category.name, category.id);
      }

      await this.bookmarkRepository.bulkCreate(
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
    } catch (error) {
      this.logger.error(
        `Bookmark import error ${(error as Error).message}`,
        (error as Error).stack
      );
    }
  }
}
