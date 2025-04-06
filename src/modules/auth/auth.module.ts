import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { SessionService } from './session.service';
import { SessionRepository } from './session.repository';
import { DrizzleModule } from '../drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, SessionService, SessionRepository],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
