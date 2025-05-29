import { BookmarkImportProgressModule } from '@/modules/bookmark-import-progress/bookmark-import-progress.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import {
  BOOKMARK_IMPORT_QUEUE_NAME,
  BOOKMARK_METADATA_QUEUE_NAME,
} from 'src/common/processors/queueNames';
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
    BookmarkModule,
    CollectionModule,
    BookmarkImportProgressModule,
  ],
  controllers: [BookmarkImportController],
  providers: [BookmarkImportService, BookmarkImportQueueProcessor],
})
export class BookmarkImportModule {}
