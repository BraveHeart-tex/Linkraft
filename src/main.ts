import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodExceptionFilter } from './filters/zod-exception.filter';
import { AuthExceptionFilter } from './filters/auth-exception.filter';
import * as cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,
    cookieName: '__Host-psifi.x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
    getTokenFromRequest: (req) => req.headers['x-csrf-token'],
  });

  app.use(doubleCsrfProtection);

  app.setGlobalPrefix('/api');
  app.useGlobalFilters(new ZodExceptionFilter(), new AuthExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
