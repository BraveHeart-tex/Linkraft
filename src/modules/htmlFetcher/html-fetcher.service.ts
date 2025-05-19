import { getErrorStack } from '@/common/utils/logging.utils';
import { LoggerService } from '@/modules/logging/logger.service';
import { Inject, Injectable } from '@nestjs/common';
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
  constructor(
    @Inject(IHttpClientToken) private readonly httpClient: IHttpClient,
    @Inject(IHtmlParserToken) private readonly htmlParser: IHtmlParser,
    @Inject(IRetryStrategyToken) private readonly retryStrategy: IRetryStrategy,
    private readonly logger: LoggerService
  ) {}

  async fetchHeadMetadataWithRetry(url: string): Promise<Metadata> {
    for (let attempt = 1; ; attempt++) {
      try {
        this.logger.log('Attempting to fetch URL', {
          context: HtmlFetcherService.name,
          meta: { attempt, url },
        });

        const headHtml = await this.httpClient.fetch(url);
        const metadata = this.htmlParser.parseHead(headHtml, url);

        this.logger.log('Successfully fetched metadata', {
          context: HtmlFetcherService.name,
          meta: { attempt, url },
        });

        return metadata;
      } catch (error) {
        const shouldRetry = this.retryStrategy.shouldRetry(error, attempt);

        this.logger[shouldRetry ? 'warn' : 'error'](
          shouldRetry ? 'Retryable fetch error' : 'Non-retryable fetch error',
          {
            trace: getErrorStack(error),
            context: HtmlFetcherService.name,
            meta: {
              attempt,
              url,
              retryable: shouldRetry,
              error: error instanceof Error ? error.message : String(error),
            },
          }
        );

        if (!shouldRetry) throw error;

        const delay = this.retryStrategy.getDelay(attempt);

        this.logger.warn('Delaying before next retry', {
          context: HtmlFetcherService.name,
          meta: { attempt, url, delay },
        });

        await this.delay(delay);
      }
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
