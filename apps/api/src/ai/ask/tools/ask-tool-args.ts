import { hasControlChars } from '@shelfmark/contracts';
import type { AskParse } from '../../models/ask-parse.type';

type Fields = Record<string, unknown>;

/** The model's arguments as a plain object, `null` for anything else. */
export function argsObject(input: unknown): Fields | null {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
    ? (input as Fields)
    : null;
}

export function refuse<T>(message: string): AskParse<T> {
  return { ok: false, message };
}

export function accept<T>(value: T): AskParse<T> {
  return { ok: true, value };
}

/** Whether every key is one of `allowed` (unknown keys are refused). */
export function onlyKeys(args: Fields, allowed: readonly string[]): boolean {
  return Object.keys(args).every((key) => allowed.includes(key));
}

/** An optional trimmed text of 1 to `max` characters without control characters. */
export function optionalText(
  value: unknown,
  max: number,
): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false };
  const text = value.replace(/\s+/gu, ' ').trim();
  if (text.length === 0) return { ok: true, value: null };
  if (Array.from(text).length > max || hasControlChars(text)) return { ok: false };
  return { ok: true, value: text };
}

/** An optional integer in `min..max`, `fallback` when absent. */
export function optionalInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number | null {
  if (value === undefined) return fallback;
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;
}
