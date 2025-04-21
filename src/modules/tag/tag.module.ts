import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TagService } from './tag.service';
import { TagRepository } from './tag.repository';
import { TagController } from './tag.controller';

@Module({
  imports: [AuthModule],
  providers: [TagService, TagRepository],
  exports: [TagRepository],
  controllers: [TagController],
})
export class TagModule {}
