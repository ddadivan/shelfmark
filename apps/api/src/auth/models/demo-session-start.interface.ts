import type { DemoSessionResponse } from '@shelfmark/contracts';

/** What `DemoSessionService.start` returns: the body and the cookies to set. */
export interface DemoSessionStart {
  body: DemoSessionResponse;
  /** Raw `Set-Cookie` header values from Better Auth. */
  setCookies: string[];
}
