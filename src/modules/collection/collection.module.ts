import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionRepository } from './collection.repository';
import { CollectionService } from './collection.service';

@Module({
  providers: [CollectionService, CollectionRepository],
  controllers: [CollectionController],
  exports: [CollectionService, CollectionRepository],
})
export class CollectionModule {}
