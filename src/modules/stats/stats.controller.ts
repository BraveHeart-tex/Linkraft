import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserSessionContext } from 'src/modules/auth/session.types';
import { StatsService } from 'src/modules/stats/stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getGeneralStatsForUser(
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.statsService.getGeneralStatsForUser(userSessionContext.user.id);
  }
}
