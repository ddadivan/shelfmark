import type { NodeEnv } from './node-env.type';

export interface AppConfig {
  port: number;
  nodeEnv: NodeEnv;
  /** True unless NODE_ENV is explicitly `development` or `test`. */
  isProduction: boolean;
}
