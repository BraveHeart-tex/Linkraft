import { BookmarkService } from '@/modules/bookmark/bookmark.service';
import { CollectionService } from '@/modules/collection/collection.service';
import { CollectionOwnershipParams } from '@/modules/collection/collection.types';
import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CollectionManagementService {
  constructor(
    private readonly collectionService: CollectionService,
    private readonly bookmarkService: BookmarkService
  ) {}

  @Transactional()
  async deleteCollectionAndCleanup(params: CollectionOwnershipParams) {
    await this.bookmarkService.softDeleteByCollectionIdAndUserId(params);
    await this.collectionService.deleteUserCollection(params);
  }
}
