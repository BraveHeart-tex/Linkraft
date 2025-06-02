import { Module } from '@nestjs/common';
import { CollectionRepository } from './collection.repository';
import { CollectionService } from './collection.service';

@Module({
  providers: [CollectionService, CollectionRepository],
  exports: [CollectionService, CollectionRepository],
})
export class CollectionModule {}
