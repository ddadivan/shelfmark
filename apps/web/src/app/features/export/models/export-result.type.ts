import type { EXPORT_RESULT } from './export-result.const';

export type ExportResult = (typeof EXPORT_RESULT)[keyof typeof EXPORT_RESULT];
