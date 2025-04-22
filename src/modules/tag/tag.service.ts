import { Injectable } from '@nestjs/common';
import { TagRepository } from './tag.repository';
import { Tag, User } from 'src/db/schema';
import { Bookmark } from '../bookmark/bookmark.types';
import { BookmarkTagRepository } from '../bookmark-tag/bookmark-tag.repository';

@Injectable()
export class TagService {
  constructor(
    private readonly tagRepository: TagRepository,
    private readonly bookmarkTagRepository: BookmarkTagRepository
  ) {}

  getUserTags(userId: User['id']) {
    return this.tagRepository.getUserTags(userId);
  }

  async syncBookmarkTags({
    bookmarkId,
    existingTagIds,
    newTags,
    userId,
  }: {
    bookmarkId: Bookmark['id'];
    existingTagIds: Tag['id'][];
    newTags: string[];
    userId: User['id'];
  }) {
    const currentRelations =
      await this.bookmarkTagRepository.findByBookmarkId(bookmarkId);
    const currentTagIds = currentRelations.map((r) => r.tagId);

    const createdTags = await this.tagRepository.bulkCreate(newTags, userId);
    const newTagIds = createdTags.map((t) => t.id);

    const desiredTagIds = new Set([...existingTagIds, ...newTagIds]);
    const toAdd = [...desiredTagIds].filter(
      (id) => !currentTagIds.includes(id)
    );
    const toRemove = currentTagIds.filter((id) => !desiredTagIds.has(id));

    await this.bookmarkTagRepository.addTagsToBookmark(bookmarkId, toAdd);
    await this.bookmarkTagRepository.removeTagsFromBookmark(
      bookmarkId,
      toRemove
    );

    return [...desiredTagIds];
  }
}
