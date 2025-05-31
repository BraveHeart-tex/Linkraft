import { isUniqueConstraintViolation } from '@/common/type-guards/isUniqueConstraintViolation';
import { isValidFaviconUrl } from '@/common/utils/url.utils';
import { ApiException } from '@/exceptions/api.exception';
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
    private readonly logger: LoggerService
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

    let faviconHash;
    try {
      const faviconBuffer =
        await this.faviconFetcherService.downloadImage(faviconUrl);

      faviconHash = this.hashFaviconImage(faviconBuffer);

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
    } catch (error) {
      if (
        hostname &&
        isUniqueConstraintViolation(error, 'favicons_domain_unique')
      ) {
        this.logger.warn('isUniqueConstraintViolation', {
          meta: {
            type: 'favicons_domain_unique',
          },
        });
        const existingFavicon =
          await this.faviconRepository.findByDomain(hostname);
        if (existingFavicon) return existingFavicon;
      }
      if (
        faviconHash &&
        isUniqueConstraintViolation(error, 'favicons_hash_unique')
      ) {
        this.logger.warn('isUniqueConstraintViolation', {
          meta: {
            type: 'favicons_hash_unique',
          },
        });
        const existingFavicon =
          await this.faviconRepository.findByHash(faviconHash);
        if (existingFavicon) return existingFavicon;
      }

      throw error;
    }
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
  }
}
