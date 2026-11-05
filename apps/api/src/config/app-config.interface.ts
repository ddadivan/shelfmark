export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  /** True unless NODE_ENV is explicitly `development` or `test`. */
  isProduction: boolean;
}
