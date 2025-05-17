import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FaviconFetcherService {
  constructor() {}

  async downloadImage(faviconUrl: string): Promise<Buffer> {
    const response = await axios.get(faviconUrl, {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(response.data);
    return buffer;
  }
}
