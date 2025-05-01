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
import { AuthGuard } from 'src/guards/auth.guard';
import { BookmarkService } from './bookmark.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserSessionContext } from '../auth/session.types';
import { zodPipe } from 'src/pipes/zod.pipe.factory';
import {
  BulkSoftDeleteBookmarkDto,
  bulkSoftDeleteBookmarkSchema,
  updateBookmarkSchema,
  UpdateBookmarkDto,
  createBookmarkSchema,
  CreateBookmarkDto,
} from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ResponseStatus } from 'src/common/decorators/response-status.decorator';

@Controller('bookmarks')
@UseGuards(AuthGuard)
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Get()
  getUserBookmarks(
    @Query('cursor', new DefaultValuePipe(0), ParseIntPipe) cursor: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search', new DefaultValuePipe('')) searchQuery: string,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.getUserBookmarks({
      userId: userSessionContext.user.id,
      limit: pageSize,
      cursor,
      searchQuery,
    });
  }

  @Get('trash')
  getTrashedUserBookmarks(
    @Query('cursor', new DefaultValuePipe(0), ParseIntPipe) cursor: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
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
    @Param('id', ParseIntPipe) bookmarkId: number,
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
    @Param('id', ParseIntPipe) bookmarkId: number,
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
    @Param('id', ParseIntPipe) bookmarkId: number,
    @Body(zodPipe(updateBookmarkSchema)) updates: UpdateBookmarkDto,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.updateUserBookmarkById({
      bookmarkId,
      updates,
      userId: userSessionContext.user.id,
    });
  }

  @Delete('/:id')
  @ResponseMessage('Bookmark moved to trash successfully.')
  @ResponseStatus(HttpStatus.OK)
  softDeleteUserBookmark(
    @Param('id', ParseIntPipe) bookmarkId: number,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.softDeleteUserBookmark({
      bookmarkId,
      userId: userSessionContext.user.id,
    });
  }

  @Delete('/:id/permanent')
  @ResponseMessage('Bookmark deleted successfully.')
  @ResponseStatus(HttpStatus.OK)
  permanentlyDeleteUserBookmark(
    @Param('id', ParseIntPipe) bookmarkId: number,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.permanentlyDeleteUserBookmark({
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
}
