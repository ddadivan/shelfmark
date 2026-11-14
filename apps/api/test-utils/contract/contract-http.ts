import type { NestExpressApplication } from '@nestjs/platform-express';
import { ContractError } from '@shelfmark/contract-tests';
import request from 'supertest';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** Query string of the given values: arrays repeat the key, `undefined` is left out. */
export function queryString(values: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        params.append(key, String(item));
      }
    }
  }
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
}

function messageOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const message: unknown = Reflect.get(body, 'message');
  return typeof message === 'string' ? message : null;
}

function detailOf(body: unknown): string {
  const message: unknown =
    typeof body === 'object' && body !== null ? Reflect.get(body, 'message') : null;
  return Array.isArray(message) ? message.join('; ') : '';
}

/**
 * Sends requests to the Nest app as one signed-in user (cookie) and turns every non-2xx answer
 * into a `ContractError`, the way the web adapter does for `HttpErrorResponse`.
 */
export class ContractHttp {
  constructor(
    private readonly app: NestExpressApplication,
    private readonly cookie: string | null,
  ) {}

  /** The parsed JSON body (`undefined` for an empty one). */
  async send<T>(method: Method, path: string, body?: object): Promise<T> {
    let call = request(this.app.getHttpServer())[method](path);
    if (this.cookie !== null) {
      call = call.set('Cookie', this.cookie);
    }
    if (body !== undefined) {
      call = call.send(body);
    }
    const response = await call;
    if (response.status < 200 || response.status >= 300) {
      throw new ContractError(response.status, messageOf(response.body), detailOf(response.body));
    }
    return (response.text === '' ? undefined : response.body) as T;
  }

  /** The raw answer, for downloads. */
  async download(path: string): Promise<{ status: number; headers: Record<string, unknown> }> {
    let call = request(this.app.getHttpServer()).get(path);
    if (this.cookie !== null) {
      call = call.set('Cookie', this.cookie);
    }
    const response = await call;
    if (response.status < 200 || response.status >= 300) {
      throw new ContractError(response.status, messageOf(response.body), detailOf(response.body));
    }
    return { status: response.status, headers: response.headers };
  }
}
