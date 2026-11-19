/** Narrowed tool arguments, or a fixed message (never repeating the input) for an `is_error` result. */
export type AskParse<T> = { ok: true; value: T } | { ok: false; message: string };
