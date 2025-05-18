import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IHtmlParserToken,
  IHttpClientToken,
  IRetryStrategyToken,
} from 'src/modules/htmlFetcher/constants/injection-tokens';
import {
  IHtmlParser,
  IHttpClient,
  IRetryStrategy,
  Metadata,
} from 'src/modules/htmlFetcher/html-fetcher.types';

@Injectable()
export class HtmlFetcherService {
  private readonly logger = new Logger(HtmlFetcherService.name);

  constructor(
    @Inject(IHttpClientToken) private readonly httpClient: IHttpClient,
    @Inject(IHtmlParserToken) private readonly htmlParser: IHtmlParser,
    @Inject(IRetryStrategyToken) private readonly retryStrategy: IRetryStrategy
  ) {}

  async fetchHeadMetadataWithRetry(url: string): Promise<Metadata> {
    for (let attempt = 1; ; attempt++) {
      try {
        this.logger.log(`Fetch attempt #${attempt} for ${url}`);
        const headHtml = await this.httpClient.fetch(url);
        const metadata = this.htmlParser.parseHead(headHtml, url);
        this.logger.log(`Success on attempt #${attempt} for ${url}`);
        return metadata;
      } catch (error) {
        if (!this.retryStrategy.shouldRetry(error, attempt)) {
          this.logger.error(
            `Non-retryable error on attempt #${attempt}`,
            error instanceof Error ? error.stack : ''
          );
          throw error;
        }
        const delay = this.retryStrategy.getDelay(attempt);
        this.logger.warn(
          `Retryable error on attempt #${attempt}: ${error instanceof Error ? error.message : error}`
        );
        this.logger.warn(`Waiting ${delay}ms before retrying...`);
        await this.delay(delay);
      }
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
