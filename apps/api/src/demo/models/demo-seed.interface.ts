import type { DemoSeedFolder } from './demo-seed-folder.interface';
import type { DemoSeedLink } from './demo-seed-link.interface';

/** Shape of `seed.json`: the library every new demo user starts with. */
export interface DemoSeed {
  folders: DemoSeedFolder[];
  /** Tag names; every tag a link uses must be listed here. */
  tags: string[];
  links: DemoSeedLink[];
}
