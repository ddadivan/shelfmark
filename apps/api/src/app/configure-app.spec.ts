import { Body, Controller, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import request from 'supertest';
import { configureApp } from './configure-app';
import { createApp } from './create-app';

class EchoDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  count!: number;
}

@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() dto: EchoDto): { name: string; countType: string } {
    return { name: dto.name, countType: typeof dto.count };
  }
}

describe('configureApp', () => {
  describe.each([
    { isProduction: false, label: 'development' },
    { isProduction: true, label: 'production' },
  ])('real app in $label', ({ isProduction }) => {
    let app: NestExpressApplication;

    beforeAll(async () => {
      app = await createApp({ isProduction });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('sets helmet headers and a request id', async () => {
      const res = await request(app.getHttpServer()).get('/api/health');
      const csp = res.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
      if (isProduction) {
        expect(csp).toContain('upgrade-insecure-requests');
        expect(res.headers['strict-transport-security']).toBeDefined();
      } else {
        expect(csp).not.toContain('upgrade-insecure-requests');
        expect(res.headers['strict-transport-security']).toBeUndefined();
      }
    });

    it('does not enable CORS', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'https://evil.example');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('serves Swagger UI and the OpenAPI document', async () => {
      const ui = await request(app.getHttpServer()).get('/api/docs').redirects(1);
      expect(ui.status).toBe(200);
      expect(ui.text).toContain('swagger-ui');
      expect(ui.text).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);

      const json = await request(app.getHttpServer()).get('/api/docs-json');
      expect(json.status).toBe(200);
      expect(Object.keys((json.body as { paths: object }).paths)).toContain('/api/health');
    });
  });

  describe('validation', () => {
    let app: NestExpressApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({ controllers: [EchoController] }).compile();
      app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
      configureApp(app, { isProduction: false });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('accepts a valid body and transforms types', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/echo')
        .send({ name: 'a', count: '5' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ name: 'a', countType: 'number' });
    });

    it('rejects unknown properties', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/echo')
        .send({ name: 'a', count: 1, admin: true });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: ['property admin should not exist'],
      });
      expect((res.body as { requestId: string }).requestId).toBeTruthy();
    });

    it('rejects invalid fields with a message array', async () => {
      const res = await request(app.getHttpServer()).post('/api/echo').send({ name: 1, count: 1 });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: ['name must be a string'] });
    });

    it('neutralises a __proto__ key without polluting prototypes', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/echo')
        .set('Content-Type', 'application/json')
        .send('{"__proto__":{"isAdmin":true},"name":"a","count":1}');
      // The own "__proto__" key is stripped by whitelisting; nothing leaks onto prototypes.
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ name: 'a', countType: 'number' });
      expect(Reflect.get({}, 'isAdmin')).toBeUndefined();
    });
  });
});
