import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import { selectRows } from '../select/select-rows';
import type { PickerOption } from './models/picker-option.interface';
import type { PickerRow } from './models/picker-row.interface';

function index(options: readonly PickerOption[], into: Map<string, PickerOption>): void {
  for (const option of options) {
    into.set(option.id, option);
    index(option.children ?? [], into);
  }
}

/**
 * Flattens the option tree into picker rows: with a query only matching names stay, plus their
 * ancestors (the matching and ordering rules of `ui-select`). The empty-value row comes first when
 * `emptyLabel` is set. Rows in `currentIds` are flagged `current`.
 */
export function pickerRows(
  options: readonly PickerOption[],
  query: string,
  emptyLabel: string,
  currentIds: readonly (string | null)[],
): PickerRow[] {
  const byId = new Map<string, PickerOption>();
  index(options, byId);
  return selectRows(options, query, emptyLabel).map((row) => {
    const option = row.id === null ? undefined : byId.get(row.id);
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      level: row.level,
      icon: row.id === null ? 'inbox' : (option?.icon ?? 'folder'),
      colour: option?.colour ?? FOLDER_COLOUR.Graphite,
      current: currentIds.includes(row.id),
    };
  });
}
