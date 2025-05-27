import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import {
  BOOKMARK_IMPORT_QUEUE_NAME,
  BOOKMARK_METADATA_QUEUE_NAME,
} from 'src/common/processors/queueNames';
import { BookmarkImportProgressService } from 'src/modules/bookmark-import/bookmark-import-progress.service';
import { RedisModule } from 'src/modules/redis/redis.module';
import { BookmarkModule } from '../bookmark/bookmark.module';
import { CollectionModule } from '../collection/collection.module';
import { BookmarkImportQueueProcessor } from './bookmark-import-queue.processor';
import { BookmarkImportController } from './bookmark-import.controller';
import { BookmarkImportService } from './bookmark-import.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BOOKMARK_IMPORT_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: BOOKMARK_METADATA_QUEUE_NAME,
    }),
    // FIXME: This is a workaround for circular dependency issues.
    forwardRef(() => BookmarkModule),
    CollectionModule,
    RedisModule,
  ],
  controllers: [BookmarkImportController],
  providers: [
    BookmarkImportService,
    BookmarkImportQueueProcessor,
    BookmarkImportProgressService,
  ],
  exports: [BookmarkImportProgressService],
})
export class BookmarkImportModule {}
