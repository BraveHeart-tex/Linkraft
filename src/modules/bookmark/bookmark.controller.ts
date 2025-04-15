import {
  Body,
  Controller,
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
  constructor(private bookmarkService: BookmarkService) {}

  @Get()
  getUserBookmarks(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('pageSize', ParseIntPipe) pageSize: number = 10,
    @Query('search') searchQuery: string = '',
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    const offset = (page - 1) * pageSize;
    return this.bookmarkService.getUserBookmarks({
      userId: userSessionContext.user.id,
      limit: pageSize,
      offset,
      searchQuery,
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
