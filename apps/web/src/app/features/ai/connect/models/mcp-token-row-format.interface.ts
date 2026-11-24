/** How a token row reads its dates; the app passes `LocaleService` and Transloco through it. */
export interface McpTokenRowFormat {
  date: (iso: string) => string;
  relative: (iso: string) => string;
  number: (value: number) => string;
  t: (key: string, params?: Record<string, string>) => string;
}
