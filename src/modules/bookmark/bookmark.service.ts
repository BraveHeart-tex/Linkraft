import { HttpStatus, Injectable } from '@nestjs/common';
import { BookmarkRepository } from './bookmark.repository';
import { BookmarkInsertDto, User } from 'src/db/schema';
import {
  Bookmark,
  BookmarkOwnershipParams,
  FindUserBookmarksParams,
  UpdateBookmarkParams,
} from './bookmark.types';
import { ApiException } from 'src/exceptions/api.exception';

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

  async createBookmarkForUser(data: BookmarkInsertDto) {
    if (
      await this.bookmarkRepository.userHasBookmarkWithUrl({
        url: data.url,
        userId: data.userId,
      })
    ) {
      throw new ApiException(
        'CONFLICT',
        'A bookmark with the same URL already exists',
        HttpStatus.CONFLICT
      );
    }
    return this.bookmarkRepository.create(data);
  }

  async updateUserBookmarkById({
    bookmarkId,
    updates,
    userId,
  }: UpdateBookmarkParams) {
    if (updates?.url) {
      const bookmarkWithSameUrl =
        await this.bookmarkRepository.findByUserIdAndUrlExcludingBookmark({
          excludeBookmarkId: bookmarkId,
          url: updates.url,
          userId,
        });

      if (bookmarkWithSameUrl) {
        throw new ApiException(
          'CONFLICT',
          'A bookmark with the same URL already exists',
          HttpStatus.CONFLICT,
          {
            bookmarkWithSameUrl,
          }
        );
      }
    }

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
