import { Module } from '@nestjs/common';
import { SearchController } from 'src/modules/search/search.controller';
import { SearchRepository } from 'src/modules/search/search.repository';
import { SearchService } from 'src/modules/search/search.service';

@Module({
  controllers: [SearchController],
  exports: [SearchService],
  providers: [SearchService, SearchRepository],
})
export class SearchModule {}
