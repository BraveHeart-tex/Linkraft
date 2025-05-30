import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  IHtmlParser,
  Metadata,
} from 'src/modules/htmlFetcher/html-fetcher.types';

@Injectable()
export class HtmlParser implements IHtmlParser {
  parseHead(headHtml: string, baseUrl: string): Metadata {
    const $ = cheerio.load(headHtml);

    const title = $('title').text().trim();

    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    const relPriority = [
      'icon',
      'shortcut icon',
      'apple-touch-icon',
      'mask-icon',
    ];

    let favicon = '';
    for (const rel of relPriority) {
      const href = $(`link[rel="${rel}"]`).attr('href');
      if (href) {
        favicon = href;
        break;
      }
    }

    const baseHref = $('base').attr('href');
    const effectiveBase = baseHref
      ? new URL(baseHref, baseUrl).toString()
      : baseUrl;

    if (
      favicon &&
      !favicon.startsWith('http') &&
      !favicon.startsWith('data:')
    ) {
      try {
        favicon = new URL(favicon, effectiveBase).toString();
      } catch {
        // ignore
      }
    }

    return { title, description, favicon };
  }
}
