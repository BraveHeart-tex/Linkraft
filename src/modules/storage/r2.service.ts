import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';
import { Readable } from 'stream';

@Injectable()
export class R2Service {
  private s3Client: S3Client;

  constructor(private readonly appConfigService: AppConfigService) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.appConfigService.getOrThrow('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.appConfigService.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.appConfigService.getOrThrow(
          'R2_SECRET_ACCESS_KEY'
        ),
      },
    });
  }

  async uploadImage(
    faviconBuffer: Buffer,
    faviconDomain: string
  ): Promise<{ url: string; r2Key: string }> {
    const r2Key = `favicons/${faviconDomain}.ico`;
    const bucketName = this.appConfigService.getOrThrow('R2_BUCKET_NAME');

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
        url: `${this.appConfigService.getOrThrow('R2_CDN_URL')}/${faviconDomain}`,
        r2Key,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      throw new Error(`An unknown error occurred ${error}`);
    }
  }
}
