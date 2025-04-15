import { Module } from '@nestjs/common';
import { DrizzleLoggerService } from './drizzle-logger.service';

@Module({
  providers: [DrizzleLoggerService],
  exports: [DrizzleLoggerService],
})
export class DrizzleLoggerModule {}
