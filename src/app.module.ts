import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  DatabaseModule,
  DRIZZLE_CONNECTION,
} from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { ExtendCookieMiddleware } from './common/middleware/extend-cookie.middleware';
import { ValidateOriginMiddleware } from './common/middleware/validate-origin.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClsModule.forRoot({
      global: true,
      plugins: [
        new ClsPluginTransactional({
          imports: [DatabaseModule],
          adapter: new TransactionalAdapterDrizzleOrm({
            drizzleInstanceToken: DRIZZLE_CONNECTION,
          }),
        }),
      ],
    }),
    DatabaseModule,
    AuthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ExtendCookieMiddleware, ValidateOriginMiddleware)
      .forRoutes('*');
  }
}
