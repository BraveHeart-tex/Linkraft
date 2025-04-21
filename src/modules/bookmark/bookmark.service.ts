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
import { CreateBookmarkDto } from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { BookmarkCollectionRepository } from '../bookmark-collection/bookmark-collection.repository';
import { BookmarkTagRepository } from '../bookmark-tag/bookmark-tag.repository';
import { CollectionService } from '../collection/collection.service';
import { TagRepository } from '../tag/tag.repository';

@Injectable()
export class BookmarkService {
  constructor(
    private readonly bookmarkRepository: BookmarkRepository,
    @InjectQueue(BOOKMARK_METADATA_QUEUE_NAME)
    private readonly metadataQueue: Queue<FetchBookmarkMetadataJob>,
    private readonly bookmarkCollectionRepository: BookmarkCollectionRepository,
    private readonly bookmarkTagRepository: BookmarkTagRepository,
    private readonly collectionService: CollectionService,
    private readonly tagRepository: TagRepository
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

  async createBookmarkForUser(dto: BookmarkInsertDto & CreateBookmarkDto) {
    const bookmarkWithSameUrl =
      await this.bookmarkRepository.userHasBookmarkWithUrl({
        url: dto.url,
        userId: dto.userId,
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

    if (dto.collectionId) {
      const userHasAccessToCollection =
        await this.collectionService.userHasAccessToCollection({
          collectionId: dto.collectionId,
          userId: dto.userId,
        });

      if (!userHasAccessToCollection) {
        throw new ApiException(
          'UNAUTHORIZED',
          'You do not have access to this collection',
          HttpStatus.UNAUTHORIZED
        );
      }
    }

    const bookmark = await this.bookmarkRepository.create({
      ...dto,
      title: dto?.title ? dto?.title : 'Fetching title...',
      isMetadataPending: true,
    });

    if (dto.collectionId) {
      await this.bookmarkCollectionRepository.addToCollection({
        bookmarkId: bookmark.id,
        collectionId: dto.collectionId,
      });
    }

    const bookmarkTagIds: number[] = [...(dto?.existingTagIds || [])];
    if (dto.newTags) {
      const createdTagIds = await this.tagRepository.bulkCreate(
        dto.newTags,
        dto.userId
      );

      bookmarkTagIds.push(...createdTagIds.map((result) => result.id));
    }

    if (bookmarkTagIds?.length) {
      await this.bookmarkTagRepository.addTagsToBookmark(
        bookmark.id,
        bookmarkTagIds
      );
    }

    await this.metadataQueue.add(FETCH_METADATA_QUEUE_NAME, {
      bookmarkId: bookmark.id,
      url: dto.url,
      userId: dto.userId,
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
