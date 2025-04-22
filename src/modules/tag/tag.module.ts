import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TagService } from './tag.service';
import { TagRepository } from './tag.repository';
import { TagController } from './tag.controller';
import { BookmarkTagModule } from '../bookmark-tag/bookmark-tag.module';

@Module({
  imports: [AuthModule, BookmarkTagModule],
  providers: [TagService, TagRepository],
  exports: [TagRepository, TagService],
  controllers: [TagController],
})
export class TagModule {}
