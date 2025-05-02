import { User } from 'src/db/schema';
import { Bookmark } from 'src/modules/bookmark/bookmark.types';

export type FetchBookmarkMetadataJob =
  | {
      type: 'single';
      bookmarkId: Bookmark['id'];
      url: string;
      userId: User['id'];
      onlyFavicon?: boolean;
    }
  | {
      type: 'bulk';
      bookmarkId: Bookmark['id'];
      url: string;
      userId: User['id'];
      onlyFavicon?: boolean;
      currentIndex: number;
      totalCount: number;
      parentJobId: string;
    };

export interface ImportBookmarkJob {
  html: string;
  userId: User['id'];
}
