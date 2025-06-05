import { RenameCollectionInput } from '@/common/validation/schemas/collection/collection.schema';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Collection, CollectionInsertDto, User } from 'src/db/schema';
import { ApiException } from 'src/exceptions/api.exception';
import { CollectionRepository } from './collection.repository';
import {
  CollectionOwnershipParams,
  FindUserCollectionsParams,
} from './collection.types';

@Injectable()
export class CollectionService {
  constructor(private readonly collectionRepository: CollectionRepository) {}
  createCollectionForUser(data: CollectionInsertDto): Promise<Collection> {
    return this.collectionRepository.create(data);
  }

  renameUserCollection(
    input: RenameCollectionInput & { id: Collection['id'] },
    userId: User['id']
  ) {
    return this.collectionRepository.update(input, userId);
  }

  getCollectionsForUser(params: FindUserCollectionsParams) {
    return this.collectionRepository.getCollectionsForUser(params);
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
