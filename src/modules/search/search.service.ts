import { Injectable } from '@nestjs/common';
import { SearchRepository } from 'src/modules/search/search.repository';
import { searchAllResponseSchema } from 'src/modules/search/search.schema';
import { SearchAllParams } from 'src/modules/search/search.types';
import { toTsQueryString } from 'src/modules/search/search.utils';

@Injectable()
export class SearchService {
  constructor(private readonly searchRepository: SearchRepository) {}

  async searchAll(params: SearchAllParams) {
    const result = await this.searchRepository.searchAll({
      ...params,
      query: toTsQueryString(params.query),
    });
    const validatedRows = searchAllResponseSchema.parse({
      results: result.rows,
    });
    return validatedRows.results;
  }
}
