import { forwardRef, Module } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkRepository } from './bookmark.repository';
import { BookmarkController } from './bookmark.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BullModule } from '@nestjs/bullmq';
import { BOOKMARK_METADATA_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkGateway } from 'src/modules/bookmark/bookmark.gateway';
import { BookmarkMetadataProcessor } from 'src/modules/bookmark/bookmark.processor';
import { HtmlFetcherService } from 'src/modules/metadata/html-fetcher.service';
import { CollectionModule } from '../collection/collection.module';
import { BookmarkTagModule } from '../bookmark-tag/bookmark-tag.module';
import { TagModule } from '../tag/tag.module';
import { MetadataScraperService } from 'src/modules/metadata/metadata-scraper.service';
import { RedisModule } from 'src/modules/redis/redis.module';
import { BookmarkImportModule } from 'src/modules/bookmark-import/bookmark-import.module';

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
  ],
  controllers: [BookmarkController],
  providers: [
    BookmarkService,
    BookmarkRepository,
    BookmarkGateway,
    BookmarkMetadataProcessor,
    MetadataScraperService,
    HtmlFetcherService,
  ],
  exports: [BookmarkService, BookmarkRepository],
})
export class BookmarkModule {}
