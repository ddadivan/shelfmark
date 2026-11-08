import type { Test } from 'supertest';

/** Supertest requests that all carry the same identity (a session cookie, or none). */
export interface TestAgent {
  get(path: string): Test;
  post(path: string): Test;
  put(path: string): Test;
  patch(path: string): Test;
  delete(path: string): Test;
}
