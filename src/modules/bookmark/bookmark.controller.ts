import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { BookmarkService } from './bookmark.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserSessionContext } from '../auth/session.types';

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
}
