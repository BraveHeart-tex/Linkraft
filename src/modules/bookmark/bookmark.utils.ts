import { Bookmark } from './bookmark.types';

export const buildBookmarkUpdateDto = (
  initialBookmarkValue: Bookmark,
  updates: Partial<Bookmark>
): Partial<Bookmark> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const changedFields = {} as Partial<Record<keyof Bookmark, any>>;

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
