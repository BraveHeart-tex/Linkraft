import { AppModule } from '@/app.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { getErrorStack } from '@/common/utils/logging.utils';
import { GlobalExceptionFilter } from '@/filters/global-exception.filter';
import { ZodExceptionFilter } from '@/filters/zod-exception.filter';
import { LoggerService } from '@/modules/logging/logger.service';
import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AuthenticatedIoAdapter } from 'src/adapters/authenticated-io-adapter';
import { SessionService } from 'src/modules/auth/session.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

const DEFAULT_APP_LOG_CONTEXT = 'Bootstrap';

export async function bootstrapApp() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  app.useWebSocketAdapter(
    new AuthenticatedIoAdapter(app, app.get(SessionService), logger)
  );

  app.enableCors({
    origin: [process.env.FRONT_END_URL!],
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.setGlobalPrefix('/api');
  app.useGlobalFilters(
    new ZodExceptionFilter(),
    new GlobalExceptionFilter(logger)
  );

  const port = process.env.PORT ?? 3000;

  try {
    await app.listen(port);
    logger.log(`🚀 Application is running on http://localhost:${port}`, {
      context: DEFAULT_APP_LOG_CONTEXT,
    });
  } catch (error) {
    logger.error('❌ Error during app startup', {
      context: DEFAULT_APP_LOG_CONTEXT,
      trace: getErrorStack(error),
    });
    process.exit(1);
  }

  handleHotReload(app, logger);
}

function handleHotReload(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  logger: LoggerService
) {
  if (module.hot) {
    logger.log('HMR is enabled', {
      context: DEFAULT_APP_LOG_CONTEXT,
    });
    module.hot.accept();
    module.hot.dispose(() => app.close());
  } else {
    logger.warn('HMR is not enabled', {
      context: DEFAULT_APP_LOG_CONTEXT,
    });
  }
}
