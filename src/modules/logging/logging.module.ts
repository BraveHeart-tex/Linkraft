import { AppConfigModule } from '@/config/app-config.module';
import { LoggerService } from '@/modules/logging/logger.service';
import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';

@Global()
@Module({
  imports: [AppConfigModule, ClsModule],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggingModule {}
