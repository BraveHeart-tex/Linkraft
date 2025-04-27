import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BOOKMARK_IMPORT_QUEUE_NAME } from 'src/common/processors/queueNames';
import { BookmarkModule } from '../bookmark/bookmark.module';
import { CollectionModule } from '../collection/collection.module';
import { BookmarkImportService } from './bookmark-import.service';
import { BookmarkImportQueueProcessor } from './bookmark-import-queue.processor';
import { BookmarkImportController } from './bookmark-import.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BOOKMARK_IMPORT_QUEUE_NAME,
    }),
    BookmarkModule,
    CollectionModule,
    AuthModule,
  ],
  controllers: [BookmarkImportController],
  providers: [BookmarkImportService, BookmarkImportQueueProcessor],
})
export class BookmarkImportModule {}
