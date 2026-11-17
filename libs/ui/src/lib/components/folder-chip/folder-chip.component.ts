import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FolderColourDirective } from '../../directives/folder-colour/folder-colour.directive';
import { IconComponent } from '../icon/icon.component';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import type { IconName } from '../icon/models/icon-name.type';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * The folder a link is in, as a small pill (#418: cards and rows of mixed feeds, Recently
 * opened): the folder glyph or emoji and the name in the folder's colour on its tint (graphite
 * for none chosen); a long name ends with "…". Static text, not a control. `hint` is read before
 * the name by screen readers only ("In folder"), so a list of cards says what the word is.
 */
@Component({
  selector: 'ui-folder-chip',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: FolderColourDirective, inputs: ['uiFolderColour: colour'] }],
  host: { class: 'ui-folder-chip', '[attr.title]': 'label()' },
  template: `
    @if (glyph(); as name) {
      <ui-icon class="ui-folder-chip__icon" [name]="name" [size]="ICON_SIZE.Sm" />
    } @else {
      <span class="ui-folder-chip__emoji" aria-hidden="true">{{ icon() }}</span>
    }
    <span class="ui-folder-chip__label">
      @if (hint()) {
        <span class="ui-folder-chip__hint">{{ hint() }}&ngsp;</span>
      }
      {{ label() }}
    </span>
  `,
  styleUrl: './folder-chip.component.scss',
})
export class FolderChipComponent {
  protected readonly ICON_SIZE = ICON_SIZE;

  /** The folder name. */
  readonly label = input.required<string>();
  /** Glyph from the Shelfmark icon set, or a single emoji; `folder` by default. */
  readonly icon = input<IconName | string>('folder');
  /** Visually hidden text before the name ("In folder"); empty for none. */
  readonly hint = input('');

  protected readonly glyph = computed<IconName | null>(
    () => ICON_NAMES.find((name) => name === this.icon()) ?? null,
  );
}
