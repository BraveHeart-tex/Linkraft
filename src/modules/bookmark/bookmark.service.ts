import { HttpStatus, Injectable } from '@nestjs/common';
import { BookmarkRepository } from './bookmark.repository';
import { BookmarkInsertDto, User } from 'src/db/schema';
import {
  Bookmark,
  BookmarkOwnershipParams,
  FindUserBookmarksParams,
  UpdateBookmarkParams,
  UpdateBookmarkReturn,
} from './bookmark.types';
import { ApiException } from 'src/exceptions/api.exception';
import { InjectQueue } from '@nestjs/bullmq';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { FETCH_BOOKMARK_METADATA_JOB_NAME } from 'src/common/processors/jobNames';
import { Queue } from 'bullmq';
import { FetchBookmarkMetadataJob } from 'src/common/processors/processors.types';
import { CreateBookmarkDto } from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { BookmarkTagRepository } from '../bookmark-tag/bookmark-tag.repository';
import { CollectionService } from '../collection/collection.service';
import { TagRepository } from '../tag/tag.repository';
import { TagService } from '../tag/tag.service';
import {
  buildBookmarkUpdateDto,
  truncateBookmarkTitle,
} from './bookmark.utils';

@Injectable()
export class BookmarkService {
  constructor(
    private readonly bookmarkRepository: BookmarkRepository,
    @InjectQueue(BOOKMARK_METADATA_QUEUE_NAME)
    private readonly metadataQueue: Queue<FetchBookmarkMetadataJob>,
    private readonly bookmarkTagRepository: BookmarkTagRepository,
    private readonly collectionService: CollectionService,
    private readonly tagRepository: TagRepository,
    private readonly tagService: TagService
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
          'You do not have access to this collection',
          HttpStatus.UNAUTHORIZED
        );
      }
    }

    const bookmark = await this.bookmarkRepository.create({
      ...dto,
      title: dto?.title
        ? truncateBookmarkTitle(dto?.title)
        : 'Fetching title...',
      isMetadataPending: true,
    });

    const bookmarkTagIds: number[] = [...(dto?.existingTagIds || [])];
    if (dto.newTags?.length) {
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

    await this.metadataQueue.add(FETCH_BOOKMARK_METADATA_JOB_NAME, {
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
  }: UpdateBookmarkParams): Promise<UpdateBookmarkReturn> {
    const bookmark = await this.bookmarkRepository.findByIdAndUserId({
      bookmarkId,
      userId,
    });

    if (!bookmark) {
      throw new ApiException('Bookmark not found', HttpStatus.NOT_FOUND);
    }

    if (updates?.url) {
      const bookmarkWithSameUrl =
        await this.bookmarkRepository.findByUserIdAndUrlExcludingBookmark({
          excludeBookmarkId: bookmarkId,
          url: updates.url,
          userId,
        });

      if (bookmarkWithSameUrl) {
        throw new ApiException(
          'A bookmark with the same URL already exists',
          HttpStatus.CONFLICT,
          {
            bookmarkWithSameUrl,
          }
        );
      }
    }

    const urlChanged = updates.url && updates.url !== bookmark.url;
    const titleChanged = updates.title && updates.title !== bookmark.title;

    const bookmarkUpdates = {
      ...buildBookmarkUpdateDto(bookmark, updates),
      ...(urlChanged && titleChanged
        ? {
            isMetadataPending: true,
          }
        : {}),
    };

    if (Object.keys(bookmarkUpdates).length > 0) {
      await this.bookmarkRepository.updateByIdAndUserId({
        bookmarkId,
        updates: bookmarkUpdates,
        userId,
      });
    }

    const createdTags = await this.tagService.syncBookmarkTags({
      bookmarkId,
      existingTagIds: updates.existingTagIds || [],
      newTags: updates.newTags || [],
      userId,
    });

    if (urlChanged && !titleChanged) {
      await this.metadataQueue.add(FETCH_BOOKMARK_METADATA_JOB_NAME, {
        bookmarkId: bookmark.id,
        url: updates.url as string,
        userId,
      });
    }

    const updatedBookmark =
      await this.bookmarkRepository.findWithTagsAndCollectionByIdAndUserId({
        bookmarkId: bookmark.id,
        userId,
      });

    if (!updatedBookmark) {
      throw new ApiException(
        'Updated bookmark not found',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return {
      success: true,
      updatedBookmark,
      createdTags,
    };
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

  emptyTrash(userId: User['id']) {
    return this.bookmarkRepository.bulkDeleteTrashedUserBookmarks(userId);
  }
}
