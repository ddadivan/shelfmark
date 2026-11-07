import { AUTH_ENV } from '../config/models/auth-env.const';
import type { AuthConfig } from '../config/models/auth-config.interface';
import { AUTH_NEST_LOGGER } from './models/auth-nest-logger.const';

/** Logs which OAuth providers are unavailable and which variables would enable them (names only). */
export function warnMissingProviders(config: AuthConfig): void {
  if (!config.providers.google) {
    AUTH_NEST_LOGGER.warn(
      `Google sign-in is disabled: set ${AUTH_ENV.GoogleClientId} and ${AUTH_ENV.GoogleClientSecret}`,
    );
  }
  if (!config.providers.github) {
    AUTH_NEST_LOGGER.warn(
      `GitHub sign-in is disabled: set ${AUTH_ENV.GitHubClientId} and ${AUTH_ENV.GitHubClientSecret}`,
    );
  }
}
