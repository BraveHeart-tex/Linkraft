import { isValidFaviconUrl } from '@/common/utils/url.utils';
import { ApiException } from '@/exceptions/api.exception';
import { LockService } from '@/modules/lock/lock.service';
import { LoggerService } from '@/modules/logging/logger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Favicon } from 'src/db/schema';
import { FaviconFetcherService } from 'src/modules/favicon/favicon-fetcher.service';
import { FaviconRepository } from 'src/modules/favicon/favicon.repository';
import { R2Service } from 'src/modules/storage/r2.service';

@Injectable()
export class FaviconService {
  constructor(
    private readonly r2Service: R2Service,
    private readonly faviconRepository: FaviconRepository,
    private readonly faviconFetcherService: FaviconFetcherService,
    private readonly logger: LoggerService,
    private readonly lockService: LockService
  ) {}

  private hashFaviconImage(faviconBuffer: Buffer): string {
    return createHash('sha256').update(faviconBuffer).digest('hex');
  }

  async storeFaviconFromUrl({
    faviconUrl,
    hostname,
  }: {
    hostname: string;
    faviconUrl: string;
  }): Promise<Favicon> {
    if (!isValidFaviconUrl(faviconUrl)) {
      this.logger.warn('Favicon URL format is invalid', {
        context: FaviconService.name,
        meta: {
          faviconUrl,
        },
      });
      throw new ApiException(
        'Favicon URL format is invalid',
        HttpStatus.BAD_REQUEST
      );
    }

    const faviconBuffer =
      await this.faviconFetcherService.downloadImage(faviconUrl);

    const faviconHash = this.hashFaviconImage(faviconBuffer);

    return await this.lockService.acquireLock(hostname, async () => {
      let existingFavicon =
        await this.faviconRepository.findByHash(faviconHash);

      if (existingFavicon) {
        return existingFavicon;
      }

      existingFavicon = await this.faviconRepository.findByDomain(hostname);

      if (existingFavicon) {
        const updatedFavicon = await this.updateFavicon({
          existingFavicon,
          faviconBuffer,
          faviconHash,
        });
        return updatedFavicon;
      }

      const r2Result = await this.r2Service.uploadImage(
        faviconBuffer,
        hostname
      );

      const newFavicon = this.faviconRepository.create({
        hash: faviconHash,
        url: r2Result.url,
        r2Key: r2Result.r2Key,
        domain: hostname,
      });

      return newFavicon;
    });
  }

  private async updateFavicon({
    existingFavicon,
    faviconBuffer,
    faviconHash,
  }: {
    existingFavicon: Favicon;
    faviconBuffer: Buffer;
    faviconHash: string;
  }): Promise<Favicon> {
    return this.lockService.acquireLock(existingFavicon.domain, async () => {
      const r2Result = await this.r2Service.uploadImage(
        faviconBuffer,
        faviconHash
      );

      existingFavicon.hash = faviconHash;
      existingFavicon.url = r2Result.url;
      existingFavicon.r2Key = r2Result.r2Key;

      await this.faviconRepository.update(existingFavicon.id, {
        hash: existingFavicon.hash,
        url: existingFavicon.url,
        r2Key: existingFavicon.r2Key,
      });

      return existingFavicon;
    });
  }
}
