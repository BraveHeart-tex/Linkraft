import { Module } from '@nestjs/common';
import { BookmarkTagModule } from '../bookmark-tag/bookmark-tag.module';
import { TagController } from './tag.controller';
import { TagRepository } from './tag.repository';
import { TagService } from './tag.service';

@Module({
  imports: [BookmarkTagModule],
  providers: [TagService, TagRepository],
  exports: [TagRepository, TagService],
  controllers: [TagController],
})
export class TagModule {}
