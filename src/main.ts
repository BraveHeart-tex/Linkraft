import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodExceptionFilter } from './filters/zod-exception.filter';

import * as cookieParser from 'cookie-parser';

import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  app.setGlobalPrefix('/api');
  app.useGlobalFilters(new ZodExceptionFilter(), new GlobalExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
