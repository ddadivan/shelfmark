export interface ConfigureAppOptions {
  /** Production gets strict helmet defaults; development drops HSTS and HTTPS upgrade. */
  isProduction: boolean;
}
