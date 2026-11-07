import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { readAuthConfig } from '../config/auth-config';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { createAuth } from './create-auth';
import { SessionAuthGuard } from './session-auth.guard';
import { warnMissingProviders } from './warn-missing-providers';

/**
 * Mounts Better Auth on `/api/auth/*` through the community Nest integration. Settings that matter:
 * - `disableTrustedOriginsCors`: the API is same-origin (ADR 0007); the integration would otherwise
 *   call `enableCors` for the trusted origins.
 * - Body parsers off: `configureApp` already installs the 100kb JSON parser with its 400/413
 *   mapping, and Better Auth reads the parsed body.
 * - `disableGlobalAuthGuard`: turns off the integration's own guard; `SessionAuthGuard` below is the
 *   global guard (ADR 0029). It never sees `/api/auth/*` (mounted outside Nest's router).
 * Not `disableControllers`: despite its name it also turns off the middleware that mounts the router.
 * Auth responses bypass `ValidationPipe` and `AllExceptionsFilter`: errors keep Better Auth's
 * `{ code, message }` shape.
 */
@Module({
  providers: [{ provide: APP_GUARD, useClass: SessionAuthGuard }],
  imports: [
    BetterAuthModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      // Global so `SessionAuthGuard` (and later modules) can inject `AuthService`.
      isGlobal: true,
      disableGlobalAuthGuard: true,
      useFactory: (prisma: PrismaService) => {
        const config = readAuthConfig();
        warnMissingProviders(config);
        return {
          auth: createAuth(prisma, config),
          disableTrustedOriginsCors: true,
          bodyParser: { json: { enabled: false }, urlencoded: { enabled: false } },
        };
      },
    }),
  ],
})
export class AuthModule {}
