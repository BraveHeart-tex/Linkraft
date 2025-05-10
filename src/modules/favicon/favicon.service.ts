import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Favicon } from 'src/db/schema';
import { FaviconRepository } from 'src/modules/favicon/favicon.repository';
import { R2Service } from 'src/modules/storage/r2.service';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class FaviconService {
  constructor(
    private readonly r2Service: R2Service,
    private readonly faviconRepository: FaviconRepository
  ) {}

  private hashFaviconImage(faviconBuffer: Buffer): string {
    return createHash('sha256').update(faviconBuffer).digest('hex');
  }

  async storeFaviconFromUrl(faviconUrl: string): Promise<Favicon> {
    const faviconBuffer = await this.r2Service.downloadImage(faviconUrl);
    const faviconDomain = new URL(faviconUrl).hostname;
    const faviconHash = this.hashFaviconImage(faviconBuffer);

    let existingFavicon = await this.faviconRepository.findByHash(faviconHash);

    if (existingFavicon) {
      return existingFavicon;
    }

    existingFavicon = await this.faviconRepository.findByDomain(faviconDomain);

    if (existingFavicon) {
      const updatedFavicon = await this.updateFavicon(
        existingFavicon,
        faviconBuffer,
        faviconHash
      );
      return updatedFavicon;
    }

    const r2Result = await this.r2Service.uploadImage(
      faviconBuffer,
      faviconHash
    );

    const newFavicon = this.faviconRepository.create({
      id: createId(),
      hash: faviconHash,
      url: r2Result.url,
      r2Key: r2Result.r2Key,
      domain: faviconDomain,
    });

    return newFavicon;
  }

  private async updateFavicon(
    existingFavicon: Favicon,
    faviconBuffer: Buffer,
    faviconHash: string
  ): Promise<Favicon> {
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
