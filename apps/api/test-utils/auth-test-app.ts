import { randomBytes } from 'node:crypto';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app/app.module';
import { configureApp } from '../src/app/configure-app';
import { AUTH_ENV } from '../src/config/models/auth-env.const';
import { PrismaService } from '../src/prisma/prisma.service';
import type { AuthTestApp } from './models/auth-test-app.interface';
import type { AuthTestAppOptions } from './models/auth-test-app-options.interface';
import { createTestDatabase } from './test-database';

const DEFAULT_BASE_URL = 'http://localhost:4200';

/**
 * The whole API (`AppModule`) on an in-memory PGlite database, with a random auth secret and
 * random Google and GitHub client credentials per call, so no secret is ever written down.
 * Environment overrides (`options.env`) apply until `close()`. Pair it with `stubOAuthProviders`.
 * One instance at a time per spec file: the overrides live in `process.env`, which is shared by
 * every test of the file, so close an app before creating the next one.
 */
export async function createAuthTestApp(options: AuthTestAppOptions = {}): Promise<AuthTestApp> {
  const authSecret = randomBytes(32).toString('hex');
  const clientSecrets = [randomBytes(16).toString('hex'), randomBytes(16).toString('hex')];
  const overrides: Record<string, string | undefined> = {
    [AUTH_ENV.Secret]: authSecret,
    ...(options.providers === false
      ? {}
      : {
          [AUTH_ENV.GoogleClientId]: 'test-google-client-id',
          [AUTH_ENV.GoogleClientSecret]: clientSecrets[0],
          [AUTH_ENV.GitHubClientId]: 'test-github-client-id',
          [AUTH_ENV.GitHubClientSecret]: clientSecrets[1],
        }),
    ...options.env,
  };
  const saved = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(overrides)) {
    saved.set(name, process.env[name]);
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  const restoreEnv = (): void => {
    for (const [name, value] of saved) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  };

  const db = await createTestDatabase();
  try {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, ...(options.imports ?? [])],
    })
      .overrideProvider(PrismaService)
      .useValue(db.prisma)
      .compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>(new ExpressAdapter(), {
      bodyParser: false,
    });
    configureApp(app, { isProduction: options.isProduction ?? false });
    await app.init();
    return {
      app,
      db,
      baseUrl: overrides[AUTH_ENV.Url] ?? DEFAULT_BASE_URL,
      secrets: [authSecret, ...clientSecrets],
      async close() {
        await app.close();
        await db.close();
        restoreEnv();
      },
    };
  } catch (error) {
    await db.close();
    restoreEnv();
    throw error;
  }
}
