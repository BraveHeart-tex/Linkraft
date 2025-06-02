import { BookmarkModule } from '@/modules/bookmark/bookmark.module';
import { CollectionManagementService } from '@/modules/collection-management/collection-management.service';
import { CollectionController } from '@/modules/collection/collection.controller';
import { CollectionModule } from '@/modules/collection/collection.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [BookmarkModule, CollectionModule],
  providers: [CollectionManagementService],
  exports: [CollectionManagementService],
  controllers: [CollectionController],
})
export class CollectionManagementModule {}
