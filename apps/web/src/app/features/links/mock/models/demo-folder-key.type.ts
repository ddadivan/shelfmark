import type { DEMO_FOLDER_KEY } from './demo-folder-key.const';

export type DemoFolderKey = (typeof DEMO_FOLDER_KEY)[keyof typeof DEMO_FOLDER_KEY];
