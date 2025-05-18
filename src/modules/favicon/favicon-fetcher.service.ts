import { IHttpClientToken } from '@/modules/htmlFetcher/constants/injection-tokens';
import { IHttpClient } from '@/modules/htmlFetcher/html-fetcher.types';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class FaviconFetcherService {
  constructor(
    @Inject(IHttpClientToken) private readonly httpClient: IHttpClient
  ) {}

  async downloadImage(faviconUrl: string): Promise<Buffer> {
    const { buffer, contentType } =
      await this.httpClient.fetchBinary(faviconUrl);
    if (!contentType.startsWith('image/')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }
    return buffer;
  }
}
