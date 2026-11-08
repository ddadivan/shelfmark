import type { DemoSeed } from './models/demo-seed.interface';
import seedJson from './seed.json';

/** The seed library, from `seed.json` (bundled into the build by webpack). */
export const DEMO_SEED: DemoSeed = seedJson;
