/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cheerio from 'cheerio';
import { Bookmark } from 'src/modules/bookmark/bookmark.types';

type ParsedBookmark = Pick<Bookmark, 'title' | 'url'> & {
  category: string | null;
};

/**
 * Parses Netscape bookmarks HTML format and returns a flat array of bookmarks
 * @param html The HTML content of the bookmarks file
 * @returns Array of bookmarks in flat structure {title, url, category}
 */
export const parseNetscapeBookmarks = (html: string): ParsedBookmark[] => {
  const $ = cheerio.load(html);
  const bookmarks: ParsedBookmark[] = [];

  $('a').each((_index, a) => {
    const $a = $(a);
    const title = $a.text().trim();
    const url = $a.attr('href') || '';
    const categories = getCategories($a);
    const category = categories.length > 0 ? (categories[0] as string) : null;

    bookmarks.push({ title, url, category });
  });

  return bookmarks;
};

/**
 * Recursively retrieves the folder hierarchy for a given anchor element
 * @param $a Cheerio anchor element
 * @returns Array of folder names from outermost to innermost
 */
function getCategories($a: cheerio.Cheerio<any>): string[] {
  const $node = $a.closest('DL').prev();
  const title = $node.text();
  if ($node.length > 0 && title.length > 0) {
    return [title].concat(getCategories($node));
  } else {
    return [];
  }
}
