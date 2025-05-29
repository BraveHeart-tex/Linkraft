import { BookmarkImportProgressModule } from '@/modules/bookmark-import-progress/bookmark-import-progress.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkGateway } from 'src/modules/bookmark/bookmark.gateway';
import { BookmarkMetadataProcessor } from 'src/modules/bookmark/bookmark.processor';
import { FaviconModule } from 'src/modules/favicon/favicon.module';
import { HtmlFetcherModule } from 'src/modules/htmlFetcher/html-fetcher.module';
import { RedisModule } from 'src/modules/redis/redis.module';
import { BookmarkTagModule } from '../bookmark-tag/bookmark-tag.module';
import { CollectionModule } from '../collection/collection.module';
import { TagModule } from '../tag/tag.module';
import { BookmarkController } from './bookmark.controller';
import { BookmarkRepository } from './bookmark.repository';
import { BookmarkService } from './bookmark.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BOOKMARK_METADATA_QUEUE_NAME,
    }),
    CollectionModule,
    TagModule,
    BookmarkTagModule,
    BookmarkImportProgressModule,
    RedisModule,
    FaviconModule,
    HtmlFetcherModule,
  ],
  controllers: [BookmarkController],
  providers: [
    BookmarkService,
    BookmarkRepository,
    BookmarkGateway,
    BookmarkMetadataProcessor,
  ],
  exports: [BookmarkService, BookmarkRepository],
})
export class BookmarkModule {}
