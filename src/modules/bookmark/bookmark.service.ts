import { buildUpdateDto } from '@/common/utils/object.utils';
import { CollectionOwnershipParams } from '@/modules/collection/collection.types';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectQueue } from '@nestjs/bullmq';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { FETCH_BOOKMARK_METADATA_JOB_NAME } from 'src/common/processors/jobNames';
import { FetchBookmarkMetadataJob } from 'src/common/processors/processors.types';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { CreateBookmarkInput } from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { BookmarkInsertDto, User } from 'src/db/schema';
import { ApiException } from 'src/exceptions/api.exception';
import { BookmarkTagRepository } from '../bookmark-tag/bookmark-tag.repository';
import { CollectionService } from '../collection/collection.service';
import { TagRepository } from '../tag/tag.repository';
import { TagService } from '../tag/tag.service';
import { BookmarkRepository } from './bookmark.repository';
import {
  Bookmark,
  BookmarkOwnershipParams,
  FindUserBookmarksParams,
  UpdateBookmarkParams,
  UpdateBookmarkReturn,
} from './bookmark.types';
import { ensureBookmarkTitleLength } from './bookmark.utils';

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
    return this.bookmarkRepository.findBookmarkWithDetailsByUserId({
      bookmarkId,
      userId,
    });
  }

  @Transactional()
  async createBookmarkForUser(dto: BookmarkInsertDto & CreateBookmarkInput) {
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
        ? ensureBookmarkTitleLength(dto?.title)
        : 'Fetching title...',
      isMetadataPending: true,
    });

    const bookmarkTagIds = [...(dto?.existingTagIds || [])];
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
      type: 'single',
      bookmarkId: bookmark.id,
      url: dto.url,
      userId: dto.userId,
    });

    return bookmark;
  }

  @Transactional()
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

    const urlChanged = updates.url && updates.url !== bookmark.url;
    const titleChanged = updates.title && updates.title !== bookmark.title;

    const bookmarkUpdates = {
      ...buildUpdateDto(bookmark, updates),
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
        type: 'single',
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
  }

  async softDeleteCollectionDescendants(params: CollectionOwnershipParams) {
    await this.bookmarkRepository.softDeleteCollectionDescendants(params);
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

  bulkDeleteUserBookmarks(userId: User['id'], bookmarkIds: Bookmark['id'][]) {
    return this.bookmarkRepository.bulkDelete(userId, bookmarkIds);
  }
}
