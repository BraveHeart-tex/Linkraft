import { SessionModule } from '@/modules/session/session.module';
import { Module } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { DatabaseModule } from '../database/database.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CookieService } from './cookie.service';

@Module({
  imports: [DatabaseModule, UserModule, SessionModule],
  controllers: [AuthController],
  providers: [AuthService, CookieService, AuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
