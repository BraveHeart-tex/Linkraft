import { CursorInput } from '@/common/validation/schemas/shared/cursor.schema';
import { Collection } from '@/db/schema';
import { Bookmark } from '@/modules/bookmark/bookmark.types';
import { DEFAULT_PAGE_SIZE } from '@/modules/database/database.constants';
import { CursorPipe } from '@/pipes/cursor.pipe';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ResponseStatus } from 'src/common/decorators/response-status.decorator';
import {
  BulkSoftDeleteBookmarkDto,
  bulkSoftDeleteBookmarkSchema,
  CreateBookmarkInput,
  CreateBookmarkSchema,
  UpdateBookmarkInput,
  UpdateBookmarkSchema,
} from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { zodPipe } from 'src/pipes/zod.pipe.factory';
import { UserSessionContext } from '../auth/session.types';
import { BookmarkService } from './bookmark.service';

@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Get()
  getUserBookmarks(
    @Query('cursor', new CursorPipe()) cursor: CursorInput,
    @Query('pageSize', new DefaultValuePipe(DEFAULT_PAGE_SIZE), ParseIntPipe)
    pageSize: number,
    @Query('search', new DefaultValuePipe('')) searchQuery: string,
    @Query('collectionId')
    collectionId: Collection['id'],
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.getUserBookmarks({
      userId: userSessionContext.user.id,
      limit: pageSize,
      cursor,
      searchQuery,
      collectionId,
      trashed: false,
    });
  }

  @Get('trash')
  getTrashedUserBookmarks(
    @Query('cursor', new CursorPipe()) cursor: CursorInput,
    @Query('pageSize', new DefaultValuePipe(DEFAULT_PAGE_SIZE), ParseIntPipe)
    pageSize: number,
    @Query('search', new DefaultValuePipe('')) searchQuery: string,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.getUserBookmarks({
      userId: userSessionContext.user.id,
      limit: pageSize,
      cursor,
      searchQuery,
      trashed: true,
    });
  }

  @Put('/:id/restore')
  @ResponseMessage('Bookmark restored successfully.')
  @ResponseStatus(HttpStatus.OK)
  async restoreUserBookmarkFromTrash(
    @Param('id', new ParseUUIDPipe()) bookmarkId: Bookmark['id'],
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.updateUserBookmarkById({
      bookmarkId,
      userId: userSessionContext.user.id,
      updates: {
        deletedAt: null,
      },
    });
  }

  @Get('/:id')
  getUserBookmarkById(
    @Param('id', new ParseUUIDPipe()) bookmarkId: Bookmark['id'],
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.getUserBookmarkById({
      bookmarkId,
      userId: userSessionContext.user.id,
    });
  }

  @Post()
  @ResponseMessage('Bookmark created successfully.')
  @ResponseStatus(HttpStatus.CREATED)
  createBookmarkForUser(
    @Body(zodPipe(CreateBookmarkSchema)) data: CreateBookmarkInput,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.createBookmarkForUser({
      ...data,
      title: data.title || 'Fetching title...',
      isMetadataPending: true,
      userId: userSessionContext.user.id,
    });
  }

  @Put('/:id')
  @ResponseMessage('Bookmark updated successfully.')
  @ResponseStatus(HttpStatus.OK)
  updateUserBookmarkById(
    @Param('id', new ParseUUIDPipe()) bookmarkId: Bookmark['id'],
    @Body(zodPipe(UpdateBookmarkSchema)) updates: UpdateBookmarkInput,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.updateUserBookmarkById({
      bookmarkId,
      updates,
      userId: userSessionContext.user.id,
    });
  }

  @Delete('bulk/permanent')
  @ResponseMessage('Bookmarks deleted successfully.')
  @ResponseStatus(HttpStatus.OK)
  bulkDeleteUserBookmarks(
    @Body(zodPipe(bulkSoftDeleteBookmarkSchema))
    data: BulkSoftDeleteBookmarkDto,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.bulkDeleteUserBookmarks(
      userSessionContext.user.id,
      data.bookmarkIds
    );
  }

  @Delete('bulk')
  @ResponseMessage('Bookmarks moved to trash successfully.')
  @ResponseStatus(HttpStatus.OK)
  bulkSoftDeleteUserBookmarks(
    @Body(zodPipe(bulkSoftDeleteBookmarkSchema))
    data: BulkSoftDeleteBookmarkDto,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.bulkSoftDeleteUserBookmarks(
      data.bookmarkIds,
      userSessionContext.user.id
    );
  }

  @Delete('/:id/permanent')
  @ResponseMessage('Bookmark deleted successfully.')
  @ResponseStatus(HttpStatus.OK)
  permanentlyDeleteUserBookmark(
    @Param('id', new ParseUUIDPipe()) bookmarkId: Bookmark['id'],
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.permanentlyDeleteUserBookmark({
      bookmarkId,
      userId: userSessionContext.user.id,
    });
  }

  @Delete('/:id')
  @ResponseMessage('Bookmark moved to trash successfully.')
  @ResponseStatus(HttpStatus.OK)
  softDeleteUserBookmark(
    @Param('id', new ParseUUIDPipe()) bookmarkId: Bookmark['id'],
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.softDeleteUserBookmark({
      bookmarkId,
      userId: userSessionContext.user.id,
    });
  }

  @Delete('/trash')
  @ResponseMessage('All trashed bookmarks deleted successfully')
  @ResponseStatus(HttpStatus.OK)
  emptyTrash(@CurrentUser() userSessionContext: UserSessionContext) {
    return this.bookmarkService.emptyTrash(userSessionContext.user.id);
  }
}
