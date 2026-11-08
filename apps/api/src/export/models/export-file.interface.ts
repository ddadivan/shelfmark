import type { Readable } from 'node:stream';

/** A prepared export: headers are known, the body streams. */
export interface ExportFile {
  filename: string;
  contentType: string;
  body: Readable;
}
