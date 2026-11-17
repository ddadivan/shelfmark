/** One folder of the demo seed. A folder's parent must be listed before it. */
export interface DemoSeedFolder {
  /** Stable reference used by links and child folders. */
  key: string;
  name: string;
  /** `key` of the parent folder, or `null` for a top-level folder. */
  parent: string | null;
  /** One of `FOLDER_COLOUR` (checked by the seed spec; a JSON import is a plain string); graphite when left out. */
  colour?: string;
  /** Shown with a background in its colour (#440); false when left out. */
  highlighted?: boolean;
}
