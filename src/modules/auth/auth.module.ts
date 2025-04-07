import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { SessionService } from './session.service';
import { SessionRepository } from './session.repository';
import { DatabaseModule } from '../database/database.module';
import { UserModule } from '../user/user.module';
import { CookieService } from './cookie.service';
import { AuthGuard } from 'src/guards/auth.guard';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    SessionService,
    SessionRepository,
    CookieService,
    AuthGuard,
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
