/** Page size and cursor rules for every cursor-paginated list (PROJECT.md 6.2). `CursorMax` is the cursor length. */
export const PAGE_LIMIT = { Default: 50, Max: 100, CursorMax: 512 } as const;
