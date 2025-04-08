import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionRepository } from './collection.repository';
import { CollectionController } from './collection.controller';
import { SessionService } from '../auth/session.service';
import { SessionRepository } from '../auth/session.repository';

@Module({
  providers: [
    CollectionService,
    CollectionRepository,
    SessionService,
    SessionRepository,
  ],
  controllers: [CollectionController],
})
export class CollectionModule {}
