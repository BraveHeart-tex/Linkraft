import { Module } from '@nestjs/common';
import { FaviconRepository } from 'src/modules/favicon/favicon.repository';
import { FaviconService } from 'src/modules/favicon/favicon.service';
import { R2Service } from 'src/modules/storage/r2.service';

@Module({
  providers: [FaviconService, FaviconRepository, R2Service],
  exports: [FaviconService, FaviconRepository],
})
export class FaviconModule {}
