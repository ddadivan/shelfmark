/** Work that runs after the response (`AiBackgroundService.defer`). */
export type AiBackgroundTask = () => Promise<void>;
