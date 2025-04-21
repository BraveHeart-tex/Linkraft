import { Module } from '@nestjs/common';
import { BookmarkCollectionService } from './bookmark-collection.service';
import { BookmarkCollectionRepository } from './bookmark-collection.repository';

@Module({
  providers: [BookmarkCollectionService, BookmarkCollectionRepository],
  exports: [BookmarkCollectionService, BookmarkCollectionRepository],
})
export class BookmarkCollectionModule {}
