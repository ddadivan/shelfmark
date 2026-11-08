import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthModule } from '../health/health.module';
import { DATABASE_ENV } from '../config/models/database-env.const';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

const UNREACHABLE_URL = 'postgresql://user:secret@127.0.0.1:1/db';

describe('PrismaModule', () => {
  const original = process.env[DATABASE_ENV.Url];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[DATABASE_ENV.Url];
    } else {
      process.env[DATABASE_ENV.Url] = original;
    }
  });

  async function boot(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule, PrismaModule],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    return app;
  }

  it('boots and serves /api/health with an unreachable database (lazy connect)', async () => {
    process.env[DATABASE_ENV.Url] = UNREACHABLE_URL;
    const app = await boot();
    try {
      await request(app.getHttpServer()).get('/api/health').expect(200);
    } finally {
      await app.close();
    }
  });

  it('disconnects the client when the app closes', async () => {
    process.env[DATABASE_ENV.Url] = UNREACHABLE_URL;
    const app = await boot();
    // The Prisma client is a Proxy: compare behaviour, not `instanceof`.
    const disconnect = vi.spyOn(app.get(PrismaService), '$disconnect');
    await app.close();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('fails at boot without DATABASE_URL, naming the variable', async () => {
    delete process.env[DATABASE_ENV.Url];
    await expect(boot()).rejects.toThrow(/DATABASE_URL is required/);
  });
});
