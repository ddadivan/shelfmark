import { Logger } from '@nestjs/common';
import { AUTH_ENV } from '../config/models/auth-env.const';
import type { AuthConfig } from '../config/models/auth-config.interface';

const logger = new Logger('Auth');

/** Logs which OAuth providers are unavailable and which variables would enable them (names only). */
export function warnMissingProviders(config: AuthConfig): void {
  if (!config.providers.google) {
    logger.warn(
      `Google sign-in is disabled: set ${AUTH_ENV.GoogleClientId} and ${AUTH_ENV.GoogleClientSecret}`,
    );
  }
  if (!config.providers.github) {
    logger.warn(
      `GitHub sign-in is disabled: set ${AUTH_ENV.GitHubClientId} and ${AUTH_ENV.GitHubClientSecret}`,
    );
  }
}
