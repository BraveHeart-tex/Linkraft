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

    let favicon =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href') ||
      '';

    if (favicon && !favicon.startsWith('http')) {
      try {
        const base = new URL(baseUrl);
        favicon = new URL(favicon, base).toString();
      } catch {
        // ignore
      }
    }

    return { title, description, favicon };
  }
}
