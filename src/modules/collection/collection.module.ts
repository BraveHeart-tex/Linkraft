import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionRepository } from './collection.repository';
import { CollectionController } from './collection.controller';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [CollectionService, CollectionRepository],
  controllers: [CollectionController],
})
export class CollectionModule {}
