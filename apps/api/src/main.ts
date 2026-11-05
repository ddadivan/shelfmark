import 'reflect-metadata';
import { createApp } from './app/create-app';
import { readAppConfig } from './config/app-config';

async function bootstrap(): Promise<void> {
  const { port, isProduction } = readAppConfig();
  const app = await createApp({ isProduction });
  await app.listen(port);
}

void bootstrap();
