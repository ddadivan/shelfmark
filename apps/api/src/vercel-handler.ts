import 'reflect-metadata';
import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import { createApp } from './app/create-app';

let expressApp: Promise<RequestListener> | undefined;

async function bootstrap(): Promise<RequestListener> {
  const app = await createApp();
  await app.init();
  const instance: unknown = app.getHttpAdapter().getInstance();
  if (typeof instance !== 'function') {
    throw new TypeError('The Nest HTTP adapter did not return a request listener');
  }
  return instance as RequestListener;
}

// One Nest app per function instance; warm invocations reuse it. A failed init is
// not cached, so the next request retries.
function getExpressApp(): Promise<RequestListener> {
  if (!expressApp) {
    expressApp = bootstrap().catch((error: unknown) => {
      expressApp = undefined;
      throw error;
    });
  }
  return expressApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const listener = await getExpressApp();
  listener(req, res);
}
