import { Module } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkRepository } from './bookmark.repository';
import { BookmarkController } from './bookmark.controller';

@Module({
  controllers: [BookmarkController],
  providers: [BookmarkService, BookmarkRepository],
})
export class BookmarkModule {}
