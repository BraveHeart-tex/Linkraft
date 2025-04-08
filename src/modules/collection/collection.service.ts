import { Injectable } from '@nestjs/common';
import { Collection, CollectionInsertDto, User } from 'src/db/schema';
import { CollectionRepository } from './collection.repository';

@Injectable()
export class CollectionService {
  constructor(private collectionRepository: CollectionRepository) {}
  createCollection(data: CollectionInsertDto): Promise<Collection> {
    return this.collectionRepository.createCollection(data);
  }

  getCollectionsForUser(userId: User['id']) {
    return this.collectionRepository.getCollectionsForUser(userId);
  }
}
