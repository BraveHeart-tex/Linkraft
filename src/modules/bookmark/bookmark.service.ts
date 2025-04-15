import { Injectable } from '@nestjs/common';
import { BookmarkRepository } from './bookmark.repository';
import { User } from 'src/db/schema';
import {
  Bookmark,
  BookmarkOwnershipParams,
  UpdateBookmarkParams,
} from './bookmark.types';

@Injectable()
export class BookmarkService {
  constructor(private bookmarkRepository: BookmarkRepository) {}

  getBookmarks(userId: User['id']) {
    return this.bookmarkRepository.getBookmarks(userId);
  }

  getBookmarkById({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.bookmarkRepository.getBookmarkById({
      bookmarkId,
      userId,
    });
  }

  updateBookmark({ bookmarkId, updates, userId }: UpdateBookmarkParams) {
    return this.bookmarkRepository.updateBookmark({
      bookmarkId,
      updates,
      userId,
    });
  }

  softDeleteBookmark({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.bookmarkRepository.softDeleteBookmark({
      bookmarkId,
      userId,
    });
  }

  async bulkSoftDeleteBookmark(
    bookmarkIds: Bookmark['id'][],
    userId: User['id']
  ) {
    const result = await this.bookmarkRepository.bulkSoftDeleteBookmark(
      bookmarkIds,
      userId
    );

    return {
      deleted: result.length,
    };
  }
}
