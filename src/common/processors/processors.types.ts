import { User } from 'src/db/schema';
import { Bookmark } from 'src/modules/bookmark/bookmark.types';

export interface FetchBookmarkMetadataJob {
  bookmarkId: Bookmark['id'];
  url: string;
  userId: User['id'];
}

export interface ImportBookmarkJob {
  html: string;
  userId: User['id'];
}
