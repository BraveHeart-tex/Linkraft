import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import {
  BOOKMARK_IMPORT_QUEUE_NAME,
  BOOKMARK_METADATA_QUEUE_NAME,
} from 'src/common/processors/queueNames';
import { BookmarkModule } from '../bookmark/bookmark.module';
import { CollectionModule } from '../collection/collection.module';
import { BookmarkImportService } from './bookmark-import.service';
import { BookmarkImportQueueProcessor } from './bookmark-import-queue.processor';
import { BookmarkImportController } from './bookmark-import.controller';
import { AuthModule } from '../auth/auth.module';
import { BookmarkImportProgressService } from 'src/modules/bookmark-import/bookmark-import-progress.service';
import { RedisModule } from 'src/modules/redis/redis.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BOOKMARK_IMPORT_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: BOOKMARK_METADATA_QUEUE_NAME,
    }),
    forwardRef(() => BookmarkModule),
    CollectionModule,
    AuthModule,
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
