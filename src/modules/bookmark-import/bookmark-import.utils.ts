import { isValidHttpUrl } from '@/common/utils/url.utils';
import { decode } from 'html-entities';
import { Parser } from 'htmlparser2';

export type BookmarkNode =
  | {
      tempId: string;
      parentId: string | null;
      type: 'collection';
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

export function topologicalSortCollections(
  collections: BookmarkNode[]
): BookmarkNode[] {
  const sorted: BookmarkNode[] = [];
  const visited = new Set<string>();
  const tempMark = new Set<string>();
  const collectionMap = new Map(collections.map((c) => [c.tempId, c]));

  function visit(node: BookmarkNode) {
    if (visited.has(node.tempId)) return;
    if (tempMark.has(node.tempId)) {
      throw new Error(
        `Cycle detected in collection hierarchy at ${node.title}`
      );
    }
    tempMark.add(node.tempId);
    if (node.parentId) {
      const parent = collectionMap.get(node.parentId);
      if (parent) visit(parent);
    }
    tempMark.delete(node.tempId);
    visited.add(node.tempId);
    sorted.push(node);
  }

  for (const node of collections) {
    visit(node);
  }

  return sorted;
}

const FORBIDDEN_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
]);

export function parseNetscapeBookmarksStreaming(html: string): BookmarkNode[] {
  const stack: string[] = [];
  const flatList: BookmarkNode[] = [];

  let currentTag: string | null = null;
  let currentFolderTitle: string | null = null;
  let currentBookmarkHref: string | null = null;
  let currentBookmarkTitle: string | null = null;
  let disallowedTagDetected = false;

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        const tag = name.toLowerCase();
        currentTag = tag;

        if (FORBIDDEN_TAGS.has(tag)) {
          disallowedTagDetected = true;
          parser.pause(); // soft-abort
        }

        if (tag === 'a') {
          currentBookmarkHref = attribs.href || null;
          currentBookmarkTitle = '';
        }

        if (tag === 'h3') {
          currentFolderTitle = '';
        }
      },

      ontext(text) {
        if (!currentTag) return;

        const cleanText = decode(text);

        if (currentTag === 'h3') {
          currentFolderTitle += cleanText;
        } else if (currentTag === 'a') {
          currentBookmarkTitle += cleanText;
        }
      },

      onclosetag(tag) {
        const lower = tag.toLowerCase();

        if (lower === 'h3') {
          const id = crypto.randomUUID();
          flatList.push({
            tempId: id,
            parentId: stack.at(-1) || null,
            type: 'collection',
            title: currentFolderTitle?.trim() || 'Untitled Folder',
          });
          stack.push(id); // expect a <DL> to follow
          currentFolderTitle = null;
        }

        if (lower === 'a') {
          if (currentBookmarkHref && isValidHttpUrl(currentBookmarkHref)) {
            const id = crypto.randomUUID();
            flatList.push({
              tempId: id,
              parentId: stack.at(-1) || null,
              type: 'bookmark',
              title: currentBookmarkTitle?.trim() || 'Untitled Bookmark',
              url: currentBookmarkHref,
            });
          }
          currentBookmarkTitle = null;
          currentBookmarkHref = null;
        }

        if (lower === 'dl') {
          // Pop current folder scope
          stack.pop();
        }

        currentTag = null;
      },
    },
    { decodeEntities: true }
  );

  parser.write(html);
  parser.end();

  if (disallowedTagDetected) {
    throw new Error(
      'Bookmark file contains forbidden elements (script/style/etc.)'
    );
  }

  return flatList;
}
