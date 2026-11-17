import { readAppConfig } from '../../config/app-config';
import { VERCEL_ENV_VAR } from '../../config/models/vercel-env.const';
import { VERCEL_ENVIRONMENT } from '../../config/models/vercel-environment.const';
import { AI_ENV } from '../models/ai-env.const';
import { AI_PROVIDER_NAME } from '../models/ai-provider-name.const';
import type { AiConfig } from '../models/ai-config.interface';

const API_KEY_SHAPE = /^\S{8,512}$/;

/** A trimmed key, `null` when unset or blank; a malformed key names the variable, never the value. */
function readKey(env: NodeJS.ProcessEnv, name: string): string | null {
  const raw = env[name]?.trim() ?? '';
  if (raw === '') return null;
  if (!API_KEY_SHAPE.test(raw))
    throw new Error(`Invalid configuration: ${name} is not a valid key`);
  return raw;
}

/**
 * Reads the AI configuration once at boot. The key comes from the platform environment only (never
 * a file, never the web app) and is never logged; errors name the variable and never echo a value.
 * A missing key is not an error: it means the mock provider. A real provider (Anthropic for links,
 * Voyage for embeddings, each with its own key) is used only when
 * the environment is production (an explicit `development` or `test` never is), not a Vercel
 * preview deployment, a key exists and `AI_PROVIDER` is not `mock`.
 */
export function readAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const provider = (env[AI_ENV.Provider] ?? '').trim().toLowerCase();
  if (
    provider !== '' &&
    provider !== AI_PROVIDER_NAME.Mock &&
    provider !== AI_PROVIDER_NAME.Anthropic
  ) {
    throw new Error(
      `Invalid configuration: ${AI_ENV.Provider} must be ${AI_PROVIDER_NAME.Mock} or ${AI_PROVIDER_NAME.Anthropic}`,
    );
  }

  const apiKey = readKey(env, AI_ENV.AnthropicApiKey);
  const voyageApiKey = readKey(env, AI_ENV.VoyageApiKey);

  const { isProduction } = readAppConfig(env);
  const preview = env[VERCEL_ENV_VAR.Environment] === VERCEL_ENVIRONMENT.Preview;
  const realAllowed = provider !== AI_PROVIDER_NAME.Mock && isProduction && !preview;
  return {
    apiKey,
    useRealProvider: apiKey !== null && realAllowed,
    voyageApiKey,
    useRealEmbeddings: voyageApiKey !== null && realAllowed,
  };
}
