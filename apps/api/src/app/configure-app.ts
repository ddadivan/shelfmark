import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ThrottlerStorage } from '@nestjs/throttler';
import helmet from 'helmet';
import { createFeedbackMessageBodyParser } from '../feedback/feedback-message-body-parser';
import { authAllowListMiddleware } from '../auth/auth-allow-list.middleware';
import { AllExceptionsFilter } from '../common/errors/all-exceptions.filter';
import { createAuthRateLimitMiddleware } from '../common/rate-limit/auth-rate-limit.middleware';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { shouldTrustProxyHeaders } from '../common/rate-limit/rate-limit-options';
import { requestIdMiddleware } from '../common/request-id/request-id.middleware';
import type { ConfigureAppOptions } from './configure-app-options.interface';
import { API_GLOBAL_PREFIX } from './models/api-global-prefix.const';

/** Shared setup for the real server, tests and the future Vercel handler. */
export function configureApp(app: NestExpressApplication, options: ConfigureAppOptions): void {
  // First in the stack so every response, including parser errors, has a request id.
  app.use(requestIdMiddleware);
  app.use(
    options.isProduction
      ? helmet()
      : helmet({
          // Plain http://localhost in development: no HTTPS upgrade, no HSTS.
          contentSecurityPolicy: {
            useDefaults: true,
            directives: { 'upgrade-insecure-requests': null },
          },
          hsts: false,
        }),
  );
  // Before the body parsers and the Better Auth router: only the four named auth routes get through.
  app.use(authAllowListMiddleware);
  // Stricter per-IP limit on sign-in, callback and sign-out (Better Auth sits outside Nest's guards).
  app.use(
    createAuthRateLimitMiddleware(
      app.get(ThrottlerStorage, { strict: false }),
      shouldTrustProxyHeaders(),
      options.authRateLimit ?? RATE_LIMIT.Auth,
    ),
  );
  // The one route that takes a larger JSON body (a base64 screenshot of up to 2 MB plus text). It
  // parses first; the global parser then skips the already parsed body. Everything else stays 100kb.
  app.use(
    createFeedbackMessageBodyParser(
      app.get(ThrottlerStorage, { strict: false }),
      shouldTrustProxyHeaders(),
    ),
  );
  app.useBodyParser('json', { limit: '100kb' });
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Public in every environment on purpose (portfolio project, no secrets in the API).
  const config = new DocumentBuilder()
    .setTitle('Shelfmark API')
    .setDescription('REST API of Shelfmark, mounted under /api.')
    .setVersion('0.0.0')
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config));
}
