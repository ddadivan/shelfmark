import type { FieldDescribedParts } from './models/field-described-parts.interface';

let lastId = 0;

/** A unique id for a field control, for example `ui-input-3`. */
export function nextFieldId(prefix = 'ui-field'): string {
  lastId += 1;
  return `${prefix}-${lastId}`;
}

/** Id of the hint element of the field whose control has `controlId`. */
export function fieldHintId(controlId: string): string {
  return `${controlId}-hint`;
}

/** Id of the error element (a polite live region) of the field. */
export function fieldErrorId(controlId: string): string {
  return `${controlId}-error`;
}

/** Id of the counter element of the field. */
export function fieldCounterId(controlId: string): string {
  return `${controlId}-counter`;
}

/**
 * The `aria-describedby` value for the control: the error first, then the hint, then the
 * counter; `null` when none of them exists, so no empty attribute is rendered.
 */
export function fieldDescribedBy(controlId: string, parts: FieldDescribedParts): string | null {
  const ids: string[] = [];
  if (parts.error) {
    ids.push(fieldErrorId(controlId));
  }
  if (parts.hint) {
    ids.push(fieldHintId(controlId));
  }
  if (parts.counter) {
    ids.push(fieldCounterId(controlId));
  }
  return ids.length > 0 ? ids.join(' ') : null;
}
