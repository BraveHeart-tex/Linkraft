import { Module } from '@nestjs/common';
import { HttpClient } from 'src/modules/htmlFetcher/clients/http-client.service';
import {
  IHtmlParserToken,
  IHttpClientToken,
  IRetryStrategyToken,
} from 'src/modules/htmlFetcher/constants/injection-tokens';
import { HtmlFetcherService } from 'src/modules/htmlFetcher/html-fetcher.service';
import { HtmlParser } from 'src/modules/htmlFetcher/parsers/html-parser.service';
import { RetryStrategy } from 'src/modules/htmlFetcher/strategies/retry-strategy.service';

@Module({
  providers: [
    HtmlFetcherService,
    HttpClient,
    HtmlParser,
    RetryStrategy,
    { provide: IHttpClientToken, useClass: HttpClient },
    { provide: IHtmlParserToken, useClass: HtmlParser },
    { provide: IRetryStrategyToken, useClass: RetryStrategy },
  ],
  exports: [HtmlFetcherService],
})
export class HtmlFetcherModule {}
