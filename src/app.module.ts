import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { DRIZZLE_CONNECTION } from './modules/database/database.tokens';
import { AuthModule } from './modules/auth/auth.module';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { ExtendCookieMiddleware } from './common/middleware/extend-cookie.middleware';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CurrentUserInterceptor } from './common/interceptors/current-user.interceptor';
import { CollectionModule } from './modules/collection/collection.module';
import { BookmarkModule } from 'src/modules/bookmark/bookmark.module';
import { BullModule } from '@nestjs/bullmq';
import { TagModule } from './modules/tag/tag.module';
import { BookmarkImportModule } from './modules/bookmark-import/bookmark-import.module';
import { StatsModule } from 'src/modules/stats/stats.module';

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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'redis'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    CollectionModule,
    BookmarkModule,
    TagModule,
    BookmarkImportModule,
    StatsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CurrentUserInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ExtendCookieMiddleware).forRoutes('*');
  }
}
