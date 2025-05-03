import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserSessionContext } from 'src/modules/auth/session.types';
import { SearchService } from 'src/modules/search/search.service';
import { decodeCursor, encodeCursor } from 'src/modules/search/search.utils';

@Controller('search')
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query: string,
    @CurrentUser() userSessionContext: UserSessionContext,
    @Query('limit') limit = 20,
    @Query('cursor') encodedCursor?: string
  ) {
    const cursor = encodedCursor ? decodeCursor(encodedCursor) : null;

    const results = await this.searchService.searchAll({
      query,
      userId: userSessionContext.user.id,
      cursorRank: cursor?.rank ?? null,
      cursorId: cursor?.id ?? null,
      limit: limit + 1,
    });

    let nextCursor: string | null = null;
    if (results.length > limit) {
      const last = results[limit - 1];
      if (last) {
        nextCursor = encodeCursor(last.rank, last.id);
      }
      results.length = limit;
    }

    return {
      results,
      nextCursor,
    };
  }
}
