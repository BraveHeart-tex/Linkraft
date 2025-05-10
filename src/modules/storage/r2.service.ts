import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AppConfigService } from 'src/config/app-config.service';
import { Readable } from 'stream';
import axios from 'axios';

@Injectable()
export class R2Service {
  private s3Client: S3Client;

  constructor(private readonly appConfigService: AppConfigService) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.appConfigService.get('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.appConfigService.get('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.appConfigService.get('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async downloadImage(faviconUrl: string): Promise<Buffer> {
    const response = await axios.get(faviconUrl, {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(response.data);
    return buffer;
  }

  async uploadImage(
    faviconBuffer: Buffer,
    faviconHash: string
  ): Promise<{ url: string; r2Key: string }> {
    const r2Key = `favicons/${faviconHash}.ico`;
    const bucketName = this.appConfigService.get('R2_BUCKET_NAME');
    const endpoint = this.appConfigService.get('R2_ENDPOINT');

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        Body: Readable.from(faviconBuffer),
        ContentType: 'image/x-icon',
        ContentLength: faviconBuffer.length,
      });
      await this.s3Client.send(command);

      return {
        url: `https://${bucketName}.${endpoint.startsWith('https') ? endpoint.substring(8) : endpoint}/favicons/${faviconHash}.ico`,
        r2Key,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      throw new Error(`An unknown error occurred ${error}`);
    }
  }

  async getImage(faviconHash: string): Promise<Buffer> {
    const downloadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `favicons/${faviconHash}.ico`,
    };

    const command = new GetObjectCommand(downloadParams);

    try {
      const { Body } = await this.s3Client.send(command);
      if (Body instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of Body) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      }
      throw new Error('Failed to download image');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to download image: ${error.message}`);
      }

      throw new Error(`Failed to download image`);
    }
  }
}
