import { MAX_BOOKMARK_TITLE_LENGTH } from './bookmark.constants';

export const ensureBookmarkTitleLength = (title: string): string =>
  title.length > MAX_BOOKMARK_TITLE_LENGTH
    ? title.slice(0, MAX_BOOKMARK_TITLE_LENGTH)
    : title;
