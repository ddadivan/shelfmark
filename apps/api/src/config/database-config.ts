import { DATABASE_ENV } from './models/database-env.const';
import type { DatabaseConfig } from './models/database-config.interface';

const POSTGRES_PROTOCOLS: readonly string[] = ['postgres:', 'postgresql:'];

/**
 * Reads and validates DATABASE_URL. Errors name the variable only: the value can hold a password
 * and is never echoed, not even in part. Never loads .env files.
 */
export function readDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const connectionString = env[DATABASE_ENV.Url];
  if (connectionString === undefined || connectionString === '') {
    throw new Error(`Invalid configuration: ${DATABASE_ENV.Url} is required`);
  }
  let protocol: string;
  try {
    protocol = new URL(connectionString).protocol;
  } catch {
    throw new Error(`Invalid configuration: ${DATABASE_ENV.Url} must be a valid URL`);
  }
  if (!POSTGRES_PROTOCOLS.includes(protocol)) {
    throw new Error(
      `Invalid configuration: ${DATABASE_ENV.Url} must use the postgres or postgresql protocol`,
    );
  }
  return { connectionString };
}
