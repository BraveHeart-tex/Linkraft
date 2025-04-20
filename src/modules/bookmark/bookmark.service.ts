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
import { InjectQueue } from '@nestjs/bullmq';
import {
  BOOKMARK_METADATA_QUEUE_NAME,
  FETCH_METADATA_QUEUE_NAME,
} from 'src/common/processors/queueNames';
import { Queue } from 'bullmq';
import { FetchBookmarkMetadataJob } from 'src/common/processors/processors.types';

@Injectable()
export class BookmarkService {
  constructor(
    private bookmarkRepository: BookmarkRepository,
    @InjectQueue(BOOKMARK_METADATA_QUEUE_NAME)
    private metadataQueue: Queue<FetchBookmarkMetadataJob>
  ) {}

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
    const bookmarkWithSameUrl =
      await this.bookmarkRepository.userHasBookmarkWithUrl({
        url: data.url,
        userId: data.userId,
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

    const bookmark = await this.bookmarkRepository.create({
      ...data,
      title: data?.title ? data?.title : 'Fetching title...',
      isMetadataPending: true,
    });

    await this.metadataQueue.add(FETCH_METADATA_QUEUE_NAME, {
      bookmarkId: bookmark.id,
      url: data.url,
      userId: data.userId,
    });

    return bookmark;
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

    await this.bookmarkRepository.updateByIdAndUserId({
      bookmarkId,
      updates,
      userId,
    });

    return null;
  }

  async softDeleteUserBookmark({
    bookmarkId,
    userId,
  }: BookmarkOwnershipParams) {
    await this.bookmarkRepository.softDeleteByIdAndUserId({
      bookmarkId,
      userId,
    });

    return null;
  }

  async permanentlyDeleteUserBookmark(params: BookmarkOwnershipParams) {
    await this.bookmarkRepository.deleteByIdAndUserId(params);
    return null;
  }

  async bulkSoftDeleteUserBookmarks(
    bookmarkIds: Bookmark['id'][],
    userId: User['id']
  ) {
    const results = await this.bookmarkRepository.bulkSoftDeleteByIdsAndUserId(
      bookmarkIds,
      userId
    );

    return {
      deleted: results.map((result) => result.deleteId),
    };
  }
}
