import type { IMPORT_FILE_PROBLEM } from './import-file-problem.const';

export type ImportFileProblem = (typeof IMPORT_FILE_PROBLEM)[keyof typeof IMPORT_FILE_PROBLEM];
