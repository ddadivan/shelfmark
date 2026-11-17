import { readAppConfig } from './app-config';
import { VERCEL_ENV_VAR } from './models/vercel-env.const';
import { EXTENSION_ORIGIN_PATTERN } from './models/extension-origin-pattern.const';
import { EXTENSION_ORIGINS_ENV } from './models/extension-origins-env.const';
import type { ExtensionConfig } from './models/extension-config.interface';

/**
 * Reads the browser extension origins at boot (ADR 0046). `EXTENSION_ORIGINS` is a comma-separated
 * list of `chrome-extension://<32 letters a-p>` origins; a malformed entry or a wildcard fails boot,
 * and the error names the variable, never the value. In production unset or empty trusts no
 * extension; on a local run (not production, no `VERCEL_ENV`) every well-formed extension origin is
 * trusted, so an unpacked development build works.
 */
export function readExtensionConfig(env: NodeJS.ProcessEnv = process.env): ExtensionConfig {
  const { isProduction } = readAppConfig(env);
  const origins = new Set<string>();
  for (const entry of (env[EXTENSION_ORIGINS_ENV] ?? '').split(',')) {
    const trimmed = entry.trim();
    if (trimmed === '') {
      continue;
    }
    if (trimmed.includes('*')) {
      throw new Error(`Invalid configuration: ${EXTENSION_ORIGINS_ENV} must not contain wildcards`);
    }
    if (!EXTENSION_ORIGIN_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid configuration: ${EXTENSION_ORIGINS_ENV} must list chrome-extension://<32 letters a-p> origins`,
      );
    }
    origins.add(trimmed);
  }
  // Any id only on a local run: never on a Vercel deployment, whatever its NODE_ENV says.
  const onVercel = (env[VERCEL_ENV_VAR.Environment] ?? '') !== '';
  return { origins: [...origins], allowAny: !isProduction && !onVercel };
}
