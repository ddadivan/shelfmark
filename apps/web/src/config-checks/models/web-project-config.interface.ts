/** The part of `apps/web/project.json` the config checks read: the build configurations. */
export interface WebProjectConfig {
  readonly targets: {
    readonly build: {
      readonly configurations: Readonly<Record<string, { readonly serviceWorker?: string }>>;
    };
  };
}
