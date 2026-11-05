import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import { readAppConfig } from '../config/app-config';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import type { ConfigureAppOptions } from './configure-app-options.interface';

export async function createApp(
  options: ConfigureAppOptions = { isProduction: readAppConfig().isProduction },
): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    bodyParser: false,
  });
  configureApp(app, options);
  return app;
}
