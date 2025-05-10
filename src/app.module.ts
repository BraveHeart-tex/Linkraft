import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { SearchModule } from 'src/modules/search/search.module';
import { configSchema } from 'src/config/config.validation.schema';
import { AppConfigService } from 'src/config/app-config.service';
import { AppConfigModule } from 'src/config/app-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const result = configSchema.safeParse(config);

        if (!result.success) {
          const errorMessages = result.error.errors
            .map((err) => `- ${err.path.join('.')}: ${err.message}`)
            .join('\n');
          throw new Error(
            `Invalid configuration detected. Please fix the following issues:\n${errorMessages}`
          );
        }

        return config;
      },
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
      imports: [AppConfigModule],
      useFactory: async (appConfigService: AppConfigService) => ({
        connection: {
          host: appConfigService.get('REDIS_HOST'),
          port: appConfigService.get('REDIS_PORT'),
        },
      }),
      inject: [AppConfigService],
    }),
    DatabaseModule,
    AuthModule,
    CollectionModule,
    BookmarkModule,
    TagModule,
    BookmarkImportModule,
    StatsModule,
    SearchModule,
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
