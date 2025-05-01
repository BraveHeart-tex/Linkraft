import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { StatsController } from 'src/modules/stats/stats.controller';
import { StatsRepository } from 'src/modules/stats/stats.repository';
import { StatsService } from 'src/modules/stats/stats.service';

@Module({
  imports: [AuthModule],
  controllers: [StatsController],
  providers: [StatsService, StatsRepository],
})
export class StatsModule {}
