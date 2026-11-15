import type { DemoSeedFolder } from './demo-seed-folder.interface';
import type { DemoSeedLink } from './demo-seed-link.interface';
import type { DemoSeedRule } from './demo-seed-rule.interface';

/** Shape of `seed.json`: the library every new demo user starts with. */
export interface DemoSeed {
  folders: DemoSeedFolder[];
  /** Tag names; every tag a link uses must be listed here. */
  tags: string[];
  links: DemoSeedLink[];
  /** Domain rules (#398). */
  rules: DemoSeedRule[];
}
