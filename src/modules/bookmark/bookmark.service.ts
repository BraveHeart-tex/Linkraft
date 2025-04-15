import { Injectable } from '@nestjs/common';
import { BookmarkRepository } from './bookmark.repository';
import { Bookmark, User } from 'src/db/schema';

@Injectable()
export class BookmarkService {
  constructor(private bookmarkRepository: BookmarkRepository) {}

  getBookmarks(userId: User['id']) {
    return this.bookmarkRepository.getBookmarks(userId);
  }

  getBookmarkById({
    bookmarkId,
    userId,
  }: {
    bookmarkId: Bookmark['id'];
    userId: User['id'];
  }) {
    return this.bookmarkRepository.getBookmarkById({
      bookmarkId,
      userId,
    });
  }
}
