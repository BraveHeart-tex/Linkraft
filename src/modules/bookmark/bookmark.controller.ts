import { Cursor } from '@/common/validation/schemas/shared/cursor.schema';
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
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ResponseStatus } from 'src/common/decorators/response-status.decorator';
import {
  BulkSoftDeleteBookmarkDto,
  CreateBookmarkDto,
  UpdateBookmarkDto,
  bulkSoftDeleteBookmarkSchema,
  createBookmarkSchema,
  updateBookmarkSchema,
} from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { AuthGuard } from 'src/guards/auth.guard';
import { zodPipe } from 'src/pipes/zod.pipe.factory';
import { UserSessionContext } from '../auth/session.types';
import { BookmarkService } from './bookmark.service';

@Controller('bookmarks')
@UseGuards(AuthGuard)
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Get()
  getUserBookmarks(
    @Query('cursor', new CursorPipe()) cursor: Cursor,
    @Query('pageSize', new DefaultValuePipe(DEFAULT_PAGE_SIZE), ParseIntPipe)
    pageSize: number,
    @Query('search', new DefaultValuePipe('')) searchQuery: string,
    @Query('collectionId', new DefaultValuePipe(0), ParseIntPipe)
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
    @Query('cursor', new CursorPipe()) cursor: Cursor,
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
    @Param('id') bookmarkId: Bookmark['id'],
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
    @Param('id') bookmarkId: Bookmark['id'],
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
    @Body(zodPipe(createBookmarkSchema)) data: CreateBookmarkDto,
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
    @Param('id') bookmarkId: Bookmark['id'],
    @Body(zodPipe(updateBookmarkSchema)) updates: UpdateBookmarkDto,
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

  @Delete('/:id(\\d+)/permanent')
  @ResponseMessage('Bookmark deleted successfully.')
  @ResponseStatus(HttpStatus.OK)
  permanentlyDeleteUserBookmark(
    @Param('id') bookmarkId: Bookmark['id'],
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
    @Param('id') bookmarkId: Bookmark['id'],
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
