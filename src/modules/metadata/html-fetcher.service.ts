import { HttpStatus, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

@Injectable()
export class HtmlFetcherService {
  private readonly axiosInstance: AxiosInstance;
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10_000,
      headers: {
        'User-Agent': 'LinkraftBot/1.0',
      },
      validateStatus: () => true,
    });

    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: (retryCount) => {
        const backoff = Math.min(retryCount * 3000, 9000);
        return backoff;
      },
      retryCondition: (error) => {
        if (error.response) {
          const { status } = error.response;
          return [
            HttpStatus.REQUEST_TIMEOUT,
            HttpStatus.PAYLOAD_TOO_LARGE,
            HttpStatus.TOO_MANY_REQUESTS,
            HttpStatus.INTERNAL_SERVER_ERROR,
            HttpStatus.BAD_GATEWAY,
            HttpStatus.SERVICE_UNAVAILABLE,
            HttpStatus.GATEWAY_TIMEOUT,
          ].includes(status);
        }

        return axiosRetry.isNetworkOrIdempotentRequestError(error);
      },
    });
  }

  async fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
    const response = await this.axiosInstance.get(url, {
      responseType: 'text',
      maxRedirects: 5,
    });

    const html = response.data;
    const finalUrl = response.request?.res?.responseUrl || url;

    return { html, finalUrl };
  }
}
