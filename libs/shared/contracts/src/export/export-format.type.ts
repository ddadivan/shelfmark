import type { EXPORT_FORMAT } from './export-format.const';

export type ExportFormat = (typeof EXPORT_FORMAT)[keyof typeof EXPORT_FORMAT];
