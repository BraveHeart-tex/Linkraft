import { Injectable } from '@nestjs/common';
import { User } from 'src/db/schema';
import { StatsRepository } from 'src/modules/stats/stats.repository';
import { GeneralStats } from 'src/modules/stats/stats.types';

@Injectable()
export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

  async getGeneralStatsForUser(userId: User['id']): Promise<GeneralStats> {
    return this.statsRepository.getGeneralStatsForUser(userId);
  }
}
