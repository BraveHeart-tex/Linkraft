import { AuthGuard } from '@/guards/auth.guard';
import { CollectionManagementModule } from '@/modules/collection-management/collection-management.module';
import { CorrelationIdMiddleware } from '@/modules/logging/logging.middleware';
import { LoggingModule } from '@/modules/logging/logging.module';
import { SessionModule } from '@/modules/session/session.module';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { AppConfigModule } from 'src/config/app-config.module';
import { AppConfigService } from 'src/config/app-config.service';
import { ConfigSchema } from 'src/config/config.validation.schema';
import { BookmarkModule } from 'src/modules/bookmark/bookmark.module';
import { SearchModule } from 'src/modules/search/search.module';
import { CurrentUserInterceptor } from './common/interceptors/current-user.interceptor';
import { ExtendCookieMiddleware } from './common/middleware/extend-cookie.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { BookmarkImportModule } from './modules/bookmark-import/bookmark-import.module';
import { CollectionModule } from './modules/collection/collection.module';
import { DatabaseModule } from './modules/database/database.module';
import { DRIZZLE_CONNECTION } from './modules/database/database.tokens';
import { TagModule } from './modules/tag/tag.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const result = ConfigSchema.safeParse(config);

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
          host: appConfigService.getOrThrow('REDIS_HOST'),
          port: appConfigService.getOrThrow('REDIS_PORT'),
        },
      }),
      inject: [AppConfigService],
    }),
    LoggingModule,
    DatabaseModule,
    AuthModule,
    CollectionModule,
    BookmarkModule,
    TagModule,
    BookmarkImportModule,
    SearchModule,
    SessionModule,
    CollectionManagementModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CurrentUserInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ExtendCookieMiddleware, CorrelationIdMiddleware)
      .forRoutes('*');
  }
}
