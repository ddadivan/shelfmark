import type { CommandGroupComponent } from '../command-group.component';
import type { CommandItemComponent } from '../command-item.component';

/** Neighbouring items of one group (`group` is null for items outside any group). */
export interface CommandSection {
  readonly group: CommandGroupComponent | null;
  readonly items: CommandItemComponent[];
}
