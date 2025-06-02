import { BookmarkTag, Collection, SlimTag } from '@/db/schema';
import { Bookmark } from '@/modules/bookmark/bookmark.types';
import { CollectionWithBookmarkDetails } from '@/modules/collection/collection.types';

export const generateRandomHexColor = (): string => {
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);
  return `#${randomColor.padStart(6, '0')}`;
};

type BookmarkTagWithTag = BookmarkTag & {
  tag: SlimTag;
};

type SlimCollection = Pick<Collection, 'id' | 'name'>;

type BookmarkWithExtras = Bookmark & {
  collection: SlimCollection | null;
  bookmarkTags: BookmarkTagWithTag[];
  favicon: { url: string | null } | null;
};

export const mapCollectionBookmark = (
  bookmark: BookmarkWithExtras
): CollectionWithBookmarkDetails['bookmarks'][number] => {
  return {
    id: bookmark.id,
    userId: bookmark.userId,
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    faviconUrl: bookmark?.favicon ? bookmark?.favicon?.url : null,
    createdAt: bookmark.createdAt,
    collectionId: bookmark.collectionId,
    deletedAt: bookmark.deletedAt,
    isMetadataPending: bookmark.isMetadataPending,
    collection: bookmark.collection,
    tags: bookmark.bookmarkTags.map((bookmarkTag) => bookmarkTag.tag),
  };
};
