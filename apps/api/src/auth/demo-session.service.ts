import { Injectable } from '@nestjs/common';
import type { DemoSessionResponse } from '@shelfmark/contracts';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { DemoSessionStart } from './models/demo-session-start.interface';
import { DEMO_SESSION_PLUGIN } from './models/demo-session-plugin.const';
import type { ShelfmarkAuth } from './models/shelfmark-auth.type';
import { toAuthSessionResponse } from './to-auth-session-response';

/**
 * The only caller of the server-only `createDemoSession` endpoint (ADR 0034). It lives next to
 * Better Auth because feature modules must not import the integration package (ADR 0029).
 */
@Injectable()
export class DemoSessionService {
  constructor(private readonly auth: AuthService<ShelfmarkAuth>) {}

  /** Starts a session for an existing, unexpired demo user; returns the body and the cookies. */
  async start(userId: string): Promise<DemoSessionStart> {
    const { headers, response } = await this.auth.api[DEMO_SESSION_PLUGIN.Endpoint]({
      body: { userId },
      returnHeaders: true,
    });
    const body: DemoSessionResponse | null = toAuthSessionResponse(response);
    if (!body) throw new Error('The demo session could not be read');
    return { body, setCookies: headers.getSetCookie() };
  }
}
