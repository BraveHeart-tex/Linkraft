import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserSessionContext } from 'src/modules/auth/session.types';
import { StatsService } from 'src/modules/stats/stats.service';

@Controller('stats')
@UseGuards(AuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getGeneralStatsForUser(
    @CurrentUser() userSessionContext: UserSessionContext
  ) {
    return this.statsService.getGeneralStatsForUser(userSessionContext.user.id);
  }
}
