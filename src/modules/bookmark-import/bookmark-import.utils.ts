import * as cheerio from 'cheerio';

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

export const sanitizeAndParseNetscapeBookmarks = (
  html: string
): BookmarkNode[] => {
  const $ = cheerio.load(html);

  $('script, style, iframe, object, embed').remove();
  $('[onerror],[onload],[onclick],[style]').remove();
  $('a[href^="javascript:"]').remove();

  const body = $('body');
  const flatList: BookmarkNode[] = [];
  extractBookmarks($, body.children('dt, dl'), null, flatList);

  return flatList;
};

function extractBookmarks(
  $: cheerio.CheerioAPI,
  elements: ReturnType<cheerio.CheerioAPI>,
  parentId: string | null,
  flatList: BookmarkNode[]
): void {
  elements.each((_, element) => {
    const el = $(element);
    if (el.is('dt')) {
      const firstChild = el.children().first();
      if (firstChild.is('h3')) {
        // Collection (Folder)
        const title = firstChild.text().trim() || 'Untitled Folder';
        const id = crypto.randomUUID();

        flatList.push({
          tempId: id,
          parentId,
          type: 'collection',
          title,
        });

        const dlNode = el.children('dl').first();
        if (dlNode.length) {
          extractBookmarks($, dlNode.children('dt, dl'), id, flatList);
        }
      } else if (firstChild.is('a')) {
        // Bookmark
        const title = firstChild.text().trim() || 'Untitled Bookmark';
        const url = firstChild.attr('href') || '';
        const id = crypto.randomUUID();

        flatList.push({
          tempId: id,
          parentId,
          type: 'bookmark',
          title,
          url,
        });
      }
    } else if (el.is('dl')) {
      // Process nested <dl> elements
      extractBookmarks($, el.children('dt, dl'), parentId, flatList);
    }
  });
}

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
