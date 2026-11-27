/** The sort keys of one link for one sort field, like the API's cursor keys (`k`, `k2`). */
export interface MockLinkKeys {
  /** `null` is a never-opened link (`lastOpenedAt` sort only). */
  readonly k: string | null;
  readonly k2?: string;
}
