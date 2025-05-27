import { SessionPolicy } from '@/modules/auth/session.policy';
import { SessionRepository } from '@/modules/auth/session.repository';
import { SessionService } from '@/modules/auth/session.service';
import { DatabaseModule } from '@/modules/database/database.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [DatabaseModule],
  providers: [SessionService, SessionRepository, SessionPolicy],
  exports: [SessionService],
})
export class SessionModule {}
