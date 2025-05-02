import { Module } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkRepository } from './bookmark.repository';
import { BookmarkController } from './bookmark.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BullModule } from '@nestjs/bullmq';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkGateway } from 'src/modules/bookmark/bookmark.gateway';
import { BookmarkMetadataProcessor } from 'src/modules/bookmark/bookmark.processor';
import { MetadataService } from 'src/modules/metadata/metadata.service';
import { CollectionModule } from '../collection/collection.module';
import { BookmarkTagModule } from '../bookmark-tag/bookmark-tag.module';
import { TagModule } from '../tag/tag.module';
import { MetadataScraperService } from 'src/modules/metadata/metadata-scraper.service';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({
      name: BOOKMARK_METADATA_QUEUE_NAME,
    }),
    CollectionModule,
    TagModule,
    BookmarkTagModule,
  ],
  controllers: [BookmarkController],
  providers: [
    BookmarkService,
    BookmarkRepository,
    BookmarkGateway,
    BookmarkMetadataProcessor,
    MetadataScraperService,
    MetadataService,
  ],
  exports: [BookmarkService, BookmarkRepository],
})
export class BookmarkModule {}
