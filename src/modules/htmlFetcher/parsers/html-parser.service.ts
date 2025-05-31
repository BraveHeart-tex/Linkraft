import { LoggerService } from '@/modules/logging/logger.service';
import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  IHtmlParser,
  Metadata,
} from 'src/modules/htmlFetcher/html-fetcher.types';

@Injectable()
export class HtmlParser implements IHtmlParser {
  constructor(private readonly logger: LoggerService) {}
  parseHead(headHtml: string, baseUrl: string): Metadata {
    const $ = cheerio.load(headHtml);

    const title = $('title').text().trim();

    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    const favicon = this.extractBestFavicon($, baseUrl);

    this.logger.debug('Extracted best favicon', {
      context: HtmlParser.name,
      meta: {
        favicon,
      },
    });

    return { title, description, favicon };
  }

  private extractBestFavicon($: cheerio.CheerioAPI, baseUrl: string): string {
    const relPriority = [
      'icon',
      'shortcut icon',
      'apple-touch-icon',
      'mask-icon',
    ];

    const baseHref = $('base').attr('href');
    const effectiveBase = baseHref
      ? new URL(baseHref, baseUrl).toString()
      : baseUrl;

    const candidates: {
      href: string;
      rel: string;
      type?: string;
      sizes?: string;
      resolvedUrl: string | null;
    }[] = [];

    for (const rel of relPriority) {
      $(`link[rel="${rel}"]`).each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        let resolvedUrl: string | null = null;

        if (href.startsWith('http') || href.startsWith('data:')) {
          resolvedUrl = href;
        } else {
          try {
            resolvedUrl = new URL(href, effectiveBase).toString();
          } catch {
            resolvedUrl = null;
          }
        }

        if (resolvedUrl) {
          candidates.push({
            href,
            rel,
            type: $(el).attr('type'),
            sizes: $(el).attr('sizes'),
            resolvedUrl,
          });
        }
      });
    }

    const weighted = candidates
      .map((c) => ({
        ...c,
        weight: this.getFaviconWeight(c),
      }))
      .sort((a, b) => b.weight - a.weight);

    return (
      weighted[0]?.resolvedUrl ||
      new URL('/favicon.ico', effectiveBase).toString()
    );
  }

  private getFaviconWeight(c: {
    type?: string;
    sizes?: string;
    rel: string;
  }): number {
    const typeScore =
      c.type === 'image/png'
        ? 3
        : c.type === 'image/svg+xml'
          ? 2
          : c.type === 'image/x-icon'
            ? 1
            : 0;

    const sizeScore = c.sizes?.includes('32x32')
      ? 3
      : c.sizes?.includes('any')
        ? 2
        : c.sizes
          ? 1
          : 0;

    const relScore = [
      'icon',
      'shortcut icon',
      'apple-touch-icon',
      'mask-icon',
    ].indexOf(c.rel);

    return (
      typeScore * 10 + sizeScore + (relScore >= 0 ? 1 / (relScore + 1) : 0)
    );
  }
}
