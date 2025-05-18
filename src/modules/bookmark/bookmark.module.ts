import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BookmarkImportModule } from 'src/modules/bookmark-import/bookmark-import.module';
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
    AuthModule,
    BullModule.registerQueue({
      name: BOOKMARK_METADATA_QUEUE_NAME,
    }),
    CollectionModule,
    TagModule,
    BookmarkTagModule,
    forwardRef(() => BookmarkImportModule),
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
