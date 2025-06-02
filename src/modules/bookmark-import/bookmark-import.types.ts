import { Collection } from '@/db/schema';

export type BookmarkTreeNode =
  | {
      tempId: string;
      parentId: string | null;
      type: 'folder';
      title: string;
      url?: never;
    }
  | {
      tempId: string;
      parentId: string | null;
      type: 'bookmark';
      title: string;
      url: string;
    };

export type BookmarkFolderNode = Extract<BookmarkTreeNode, { type: 'folder' }>;
export type BookmarkItemNode = Extract<BookmarkTreeNode, { type: 'bookmark' }>;

// Configuration interface for better type safety
export interface ImportConfig {
  batchSize: number;
  bookmarkChunkSize: number;
  maxRetries: number;
  timeoutMs: number;
}

// Result interfaces for better type safety
export interface ImportResult {
  collectionsCreated: number;
  bookmarksCreated: number;
  bookmarksSkipped: number;
  durationMs: number;
}

export interface CollectionCreationResult {
  collectionMap: Map<string, Collection['id']>;
  totalCreated: number;
}

export interface BookmarkValidationResult {
  validBookmarks: BookmarkItemNode[];
  skippedCount: number;
}
