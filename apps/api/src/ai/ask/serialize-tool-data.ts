/**
 * A tool result as the model reads it (ADR 0055 point 3): an error message as is (fixed text), data
 * as JSON with every `<` escaped (`<`), so saved text can never open or close a prompt block.
 */
export function serializeToolData(data: unknown, isError: boolean): string {
  if (isError && typeof data === 'string') return data;
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}
