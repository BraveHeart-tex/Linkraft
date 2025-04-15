import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
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
} from 'src/common/validation/schemas/bookmark/bookmark.schema';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ResponseStatus } from 'src/common/decorators/response-status.decorator';

@Controller('bookmarks')
@UseGuards(AuthGuard)
export class BookmarkController {
  constructor(private bookmarkService: BookmarkService) {}

  @Get()
  getBookmarks(@CurrentUser() userSessionContext: UserSessionContext) {
    return this.bookmarkService.getBookmarks(userSessionContext.user.id);
  }

  @Get('/:id')
  getBookmarkById(
    @Param('id', ParseIntPipe) bookmarkId: number,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.getBookmarkById({
      bookmarkId,
      userId: userSessionContext.user.id,
    });
  }

  // @Post()
  // @ResponseMessage('Bookmark created successfully.')
  // @ResponseStatus(HttpStatus.CREATED)
  // createBookmark(
  //   @Body(zodPipe(createBookmarkSchema)) data: CreateBookmarkSchemaDto,
  //   @CurrentUser() userSessionContext: UserSessionContext
  // ) {}

  @Delete('/:id')
  @ResponseMessage('Bookmark moved to trash successfully.')
  @ResponseStatus(HttpStatus.OK)
  softDeleteBookmark(
    @Param('id', ParseIntPipe) bookmarkId: number,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.softDeleteBookmark({
      bookmarkId,
      userId: userSessionContext.user.id,
    });
  }

  bulkSoftDeleteBookmark(
    @Body(zodPipe(bulkSoftDeleteBookmarkSchema))
    data: BulkSoftDeleteBookmarkDto,
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.bookmarkService.bulkSoftDeleteBookmark(
      data.bookmarkIds,
      userSessionContext.user.id
    );
  }
}
