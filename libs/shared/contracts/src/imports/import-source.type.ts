import type { IMPORT_SOURCE } from './import-source.const';

export type ImportSource = (typeof IMPORT_SOURCE)[keyof typeof IMPORT_SOURCE];
