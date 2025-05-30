import { MAX_BOOKMARK_TITLE_LENGTH } from './bookmark.constants';
import { Bookmark } from './bookmark.types';

export const buildBookmarkUpdateDto = (
  initialBookmarkValue: Bookmark,
  updates: Partial<Bookmark>
): Partial<Bookmark> => {
  const changedFields = {} as Partial<Bookmark>;

  Object.entries(updates).forEach(([key, newValue]) => {
    const k = key as keyof Bookmark;
    const initialValue = initialBookmarkValue[k];

    if (
      !Object.is(initialValue, newValue) &&
      Object.prototype.hasOwnProperty.call(initialBookmarkValue, key)
    ) {
      changedFields[k] = newValue;
    }
  });

  return changedFields;
};

export const ensureBookmarkTitleLength = (title: string): string =>
  title.length > MAX_BOOKMARK_TITLE_LENGTH
    ? title.slice(0, MAX_BOOKMARK_TITLE_LENGTH)
    : title;
