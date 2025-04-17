import { Module } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkRepository } from './bookmark.repository';
import { BookmarkController } from './bookmark.controller';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BookmarkController],
  providers: [BookmarkService, BookmarkRepository],
})
export class BookmarkModule {}
