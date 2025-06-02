import { HttpClient } from '@/modules/htmlFetcher/clients/http-client.service';
import { IHttpClientToken } from '@/modules/htmlFetcher/constants/injection-tokens';
import { LockModule } from '@/modules/lock/lock.module';
import { Module } from '@nestjs/common';
import { FaviconFetcherService } from 'src/modules/favicon/favicon-fetcher.service';
import { FaviconRepository } from 'src/modules/favicon/favicon.repository';
import { FaviconService } from 'src/modules/favicon/favicon.service';
import { R2Service } from 'src/modules/storage/r2.service';

@Module({
  imports: [LockModule],
  providers: [
    FaviconService,
    FaviconRepository,
    R2Service,
    FaviconFetcherService,
    { provide: IHttpClientToken, useClass: HttpClient },
  ],
  exports: [FaviconService, FaviconRepository],
})
export class FaviconModule {}
