import type { SelectOption } from './models/select-option.interface';
import type { SelectRow } from './models/select-row.interface';

/** Separator of the names in a row's `path`. */
export const SELECT_PATH_SEPARATOR = ' / ';

function fold(text: string): string {
  return text.trim().toLocaleLowerCase();
}

function visit(
  option: SelectOption,
  level: number,
  parents: readonly string[],
  query: string,
): SelectRow[] {
  const names = [...parents, option.name];
  const nested = (option.children ?? []).flatMap((child) => visit(child, level + 1, names, query));
  const matches = query === '' || fold(option.name).includes(query);
  if (!matches && nested.length === 0) {
    return [];
  }
  return [
    { id: option.id, name: option.name, path: names.join(SELECT_PATH_SEPARATOR), level },
    ...nested,
  ];
}

/**
 * Flattens the option tree into listbox rows in tree order. With a query only matching names
 * stay, plus their ancestors (so a match keeps its place in the tree). The empty-value row comes
 * first when `emptyLabel` is set and, with a query, matches it.
 */
export function selectRows(
  options: readonly SelectOption[],
  query: string,
  emptyLabel: string,
): SelectRow[] {
  const q = fold(query);
  const rows: SelectRow[] = [];
  if (emptyLabel && (q === '' || fold(emptyLabel).includes(q))) {
    rows.push({ id: null, name: emptyLabel, path: emptyLabel, level: 0 });
  }
  for (const option of options) {
    rows.push(...visit(option, 0, [], q));
  }
  return rows;
}

/** The row for a value, searched in the whole tree (not only the filtered rows). */
export function selectedRow(
  options: readonly SelectOption[],
  value: string | null,
  emptyLabel: string,
): SelectRow | undefined {
  if (value === null) {
    return emptyLabel ? { id: null, name: emptyLabel, path: emptyLabel, level: 0 } : undefined;
  }
  return selectRows(options, '', '').find((row) => row.id === value);
}
