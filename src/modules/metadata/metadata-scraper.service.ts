import { Injectable, Logger } from '@nestjs/common';
import metascraper from 'metascraper';

@Injectable()
export class MetadataScraperService {
  private readonly logger = new Logger(MetadataScraperService.name);

  createScraper(rules: metascraper.Rules[]) {
    return metascraper(rules);
  }

  async scrapeMetadata({
    html,
    url,
    rules,
  }: {
    html: string;
    url: string;
    rules: metascraper.Rules[];
  }) {
    const scraper = this.createScraper(rules);
    try {
      const metadata = await scraper({ html, url });
      this.logger.debug(`Extracted metadata: ${JSON.stringify(metadata)}`);
      return metadata;
    } catch (error) {
      this.logger.error('Failed to scrape metadata', error);
      throw error;
    }
  }
}
