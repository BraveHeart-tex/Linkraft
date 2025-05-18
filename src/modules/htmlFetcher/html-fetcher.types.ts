export interface Metadata {
  title?: string;
  description?: string;
  favicon?: string;
}

export interface IHttpClient {
  fetch(url: string): Promise<string>;
  fetchBinary(url: string): Promise<{ buffer: Buffer; contentType: string }>;
}

export interface IHtmlParser {
  parseHead(html: string, baseUrl: string): Metadata;
}

export interface IRetryStrategy {
  shouldRetry(error: unknown, attempt: number): boolean;
  getDelay(attempt: number): number;
}
