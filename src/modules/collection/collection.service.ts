import { HttpStatus, Injectable } from '@nestjs/common';
import { Collection, CollectionInsertDto, User } from 'src/db/schema';
import { CollectionRepository } from './collection.repository';
import { CollectionOwnershipParams } from './collection.types';
import { ApiException } from 'src/exceptions/api.exception';

@Injectable()
export class CollectionService {
  constructor(private readonly collectionRepository: CollectionRepository) {}
  createCollectionForUser(data: CollectionInsertDto): Promise<Collection> {
    return this.collectionRepository.create(data);
  }

  updateUserCollection(
    updatedData: Partial<CollectionInsertDto> & { id: number },
    userId: User['id']
  ) {
    return this.collectionRepository.update(updatedData, userId);
  }
  getCollectionsForUser(userId: User['id']) {
    return this.collectionRepository.getCollectionsForUser(userId);
  }

  deleteUserCollection(params: CollectionOwnershipParams) {
    return this.collectionRepository.deleteUserCollection(params);
  }

  userHasAccessToCollection(params: CollectionOwnershipParams) {
    return this.collectionRepository.userHasAccessToCollection(params);
  }

  async getAccessibleCollectionById(params: CollectionOwnershipParams) {
    const collectionWithBookmarks =
      await this.collectionRepository.getByIdForUser(params);

    if (!collectionWithBookmarks) {
      throw new ApiException('Collection not found', HttpStatus.NOT_FOUND);
    }

    return collectionWithBookmarks;
  }
}
