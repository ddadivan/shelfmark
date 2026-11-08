import type { NestExpressApplication } from '@nestjs/platform-express';
import type { TestDatabase } from './test-database.interface';

export interface AuthTestApp {
  readonly app: NestExpressApplication;
  readonly db: TestDatabase;
  /** The `BETTER_AUTH_URL` the app runs with. */
  readonly baseUrl: string;
  /** Every secret generated for this app (auth secret, client secrets). */
  readonly secrets: readonly string[];
  /** Closes the app and the database and restores the environment. */
  close(): Promise<void>;
}
