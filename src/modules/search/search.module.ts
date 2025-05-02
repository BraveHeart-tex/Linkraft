import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SearchController } from 'src/modules/search/search.controller';
import { SearchRepository } from 'src/modules/search/search.repository';
import { SearchService } from 'src/modules/search/search.service';

@Module({
  imports: [AuthModule],
  controllers: [SearchController],
  exports: [SearchService],
  providers: [SearchService, SearchRepository],
})
export class SearchModule {}
