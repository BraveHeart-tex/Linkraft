import { Injectable } from '@nestjs/common';
import { BookmarkRepository } from './bookmark.repository';
import { BookmarkInsertDto, User } from 'src/db/schema';
import {
  Bookmark,
  BookmarkOwnershipParams,
  FindUserBookmarksParams,
  UpdateBookmarkParams,
} from './bookmark.types';

@Injectable()
export class BookmarkService {
  constructor(private bookmarkRepository: BookmarkRepository) {}

  getUserBookmarks(params: FindUserBookmarksParams) {
    return this.bookmarkRepository.findAllByUserId(params);
  }

  getUserBookmarkById({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.bookmarkRepository.findByIdAndUserId({
      bookmarkId,
      userId,
    });
  }

  createBookmarkForUser(data: BookmarkInsertDto) {
    return this.bookmarkRepository.create(data);
  }

  updateUserBookmarkById({
    bookmarkId,
    updates,
    userId,
  }: UpdateBookmarkParams) {
    return this.bookmarkRepository.updateByIdAndUserId({
      bookmarkId,
      updates,
      userId,
    });
  }

  softDeleteUserBookmark({ bookmarkId, userId }: BookmarkOwnershipParams) {
    return this.bookmarkRepository.softDeleteByIdAndUserId({
      bookmarkId,
      userId,
    });
  }

  async bulkSoftDeleteUserBookmarks(
    bookmarkIds: Bookmark['id'][],
    userId: User['id']
  ) {
    const result = await this.bookmarkRepository.bulkSoftDeleteByIdsAndUserId(
      bookmarkIds,
      userId
    );

    return {
      deleted: result.length,
    };
  }
}
