import type { ExportFormat } from '@shelfmark/contracts';

/** The last whole-library export on this device. */
export interface LastExport {
  readonly format: ExportFormat;
  /** ISO timestamp. */
  readonly at: string;
}
