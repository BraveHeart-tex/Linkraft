import * as cheerio from 'cheerio';
import { Bookmark } from 'src/modules/bookmark/bookmark.types';

type ParsedBookmark = Pick<Bookmark, 'title' | 'url'> & {
  category: string | null;
};

export const parseBookmarksHtml = (htmlContent: string) => {
  const $ = cheerio.load(htmlContent);
  const bookmarks: ParsedBookmark[] = [];

  $('DL').each(function (_index, dl) {
    const category = $(dl).prevUntil('DL').last().text().trim() || null;

    $(dl)
      .find('A')
      .each(function (_index, a) {
        const $a = $(a);
        const title = $a.text();
        const url = $a.attr('href') || '';

        bookmarks.push({
          title,
          url,
          category,
        });
      });
  });

  return { bookmarks };
};
