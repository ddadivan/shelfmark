import type { ExportQuery } from '@shelfmark/contracts';
import type { ContractExportFile } from './contract-export-file.interface';

/** `GET /api/export` as the scenarios call it: the saved file, never its content (the mock has none). */
export interface ContractExportApi {
  download(query: ExportQuery): Promise<ContractExportFile>;
}
