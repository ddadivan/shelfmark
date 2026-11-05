import type { AppConfig } from './app-config.interface';

const NODE_ENVS = ['development', 'production', 'test'] as const;
const NON_PRODUCTION_ENVS = ['development', 'test'];
const DEFAULT_PORT = 3000;

/**
 * Typed reader for process environment variables, validated at boot.
 * It never loads .env files: values come from the platform (Vercel, shell).
 * Fail-safe: only an explicit `development` or `test` is non-production.
 */
export function readAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawPort = env['PORT'];
  let port = DEFAULT_PORT;
  if (rawPort !== undefined && rawPort !== '') {
    port = /^\d+$/.test(rawPort) ? Number(rawPort) : Number.NaN;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('Invalid configuration: PORT must be an integer between 1 and 65535');
    }
  }

  const rawNodeEnv = env['NODE_ENV'] ?? 'production';
  const nodeEnv = NODE_ENVS.find((value) => value === rawNodeEnv);
  if (!nodeEnv) {
    throw new Error(`Invalid configuration: NODE_ENV must be one of ${NODE_ENVS.join(', ')}`);
  }

  return { port, nodeEnv, isProduction: !NON_PRODUCTION_ENVS.includes(nodeEnv) };
}
