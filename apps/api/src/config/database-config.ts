import { DATABASE_ENV } from './models/database-env.const';
import { DATABASE_POOL_LIMIT } from './models/database-pool-limit.const';
import type { DatabaseConfig } from './models/database-config.interface';

const POSTGRES_PROTOCOLS: readonly string[] = ['postgres:', 'postgresql:'];

/**
 * Reads and validates DATABASE_URL and the optional DATABASE_POOL_MAX. Errors name the variable only: the value can hold a password
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
  return { connectionString, poolMax: readPoolMax(env) };
}

function readPoolMax(env: NodeJS.ProcessEnv): number {
  const raw = env[DATABASE_ENV.PoolMax];
  if (raw === undefined || raw === '') return DATABASE_POOL_LIMIT.Default;
  const value = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!(value >= DATABASE_POOL_LIMIT.Min && value <= DATABASE_POOL_LIMIT.Max)) {
    throw new Error(
      `Invalid configuration: ${DATABASE_ENV.PoolMax} must be an integer from ${DATABASE_POOL_LIMIT.Min} to ${DATABASE_POOL_LIMIT.Max}`,
    );
  }
  return value;
}
