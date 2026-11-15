/** One domain rule of the demo seed (#398): shows what a rule does on the next matching save. */
export interface DemoSeedRule {
  /** Already normalised (`normalizeRuleDomain`). */
  domain: string;
  /** `key` of a seed folder, or `null`. */
  folder: string | null;
  /** Tag names; every one must be listed in the seed's tags. */
  tags: string[];
}
