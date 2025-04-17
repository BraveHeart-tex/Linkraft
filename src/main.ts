import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodExceptionFilter } from './filters/zod-exception.filter';
import { Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: [process.env.FRONT_END_URL!],
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.setGlobalPrefix('/api');
  app.useGlobalFilters(new ZodExceptionFilter(), new GlobalExceptionFilter());

  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  logger.log(`Application is running on PORT: ${port}`);

  console.log('HMR is enabled');

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(async () => {
      const logger = new Logger('HMR');
      logger.log('Disposing HMR...');
      try {
        console.log('About to close app...');
        await app.close();
        console.log('App closed successfully.');
      } catch (error) {
        console.error('Error during HMR disposal:', error);
      }
    });
  } else {
    console.log('HMR is not enabled');
  }
}

bootstrap();
