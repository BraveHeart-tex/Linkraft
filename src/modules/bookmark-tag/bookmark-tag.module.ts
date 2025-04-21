import { Module } from '@nestjs/common';
import { BookmarkTagService } from './bookmark-tag.service';
import { BookmarkTagRepository } from './bookmark-tag.repository';

@Module({
  providers: [BookmarkTagService, BookmarkTagRepository],
  exports: [BookmarkTagRepository],
})
export class BookmarkTagModule {}
