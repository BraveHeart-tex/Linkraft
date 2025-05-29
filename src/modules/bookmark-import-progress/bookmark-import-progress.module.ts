import { BookmarkImportProgressService } from '@/modules/bookmark-import-progress/bookmark-import-progress.service';
import { RedisModule } from '@/modules/redis/redis.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [RedisModule],
  providers: [BookmarkImportProgressService],
  exports: [BookmarkImportProgressService],
})
export class BookmarkImportProgressModule {}
