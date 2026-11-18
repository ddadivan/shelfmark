import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  numberAttribute,
  output,
} from '@angular/core';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { IconComponent } from '../../icon/icon.component';
import { ICON_SIZE } from '../../icon/models/icon-size.const';

/** Upper bound for `skeletonCount`, so a bad binding cannot render thousands of nodes. */
const MAX_SKELETONS = 6;

/**
 * The row of suggestion chips under a field (Suggestion spec): a spark and the label
 * ("Suggested"), the projected `ui-suggestion` chips and, with two or more chips, "Add all". It is
 * an Angular Aria toolbar (host directive, so chips in projected content join it): one tab stop
 * per row, arrow keys between the chips and the x buttons, Home and End. The accessible name is
 * `ariaLabel` ("Suggested tags" / "Suggested folder").
 *
 * `loading` swaps the chips for skeleton pills and "Suggesting…" in a polite status region
 * (`aria-busy`). `announcement` is a polite live region the feature writes into after an accept
 * ("Tag signals added"). The feature hides the whole row (`@if`) when AI is off, nothing fits
 * or on error: the place collapses, there is no placeholder.
 */
@Component({
  selector: 'ui-suggestion-row',
  imports: [IconComponent, ToolbarWidget],
  hostDirectives: [{ directive: Toolbar, inputs: ['orientation'] }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-suggestion-row',
    '[attr.role]': "loading() ? 'status' : 'toolbar'",
    '[attr.aria-label]': 'loading() ? null : ariaLabel()',
    '[attr.aria-busy]': "loading() ? 'true' : null",
    // A status region takes neither of the toolbar's own attributes.
    '[attr.aria-orientation]': "loading() ? null : 'horizontal'",
    '[attr.aria-disabled]': 'null',
  },
  templateUrl: './suggestion-row.component.html',
  styleUrl: './suggestion-row.component.scss',
})
export class SuggestionRowComponent {
  protected readonly ICON_SIZE = ICON_SIZE;

  /** The visible label after the spark. */
  readonly label = input('Suggested');
  /** Accessible name of the group ("Suggested tags", "Suggested folder"). */
  readonly ariaLabel = input.required<string>();
  /** Show the "Add all" button (the feature sets it for two or more chips). */
  readonly addAll = input(false, { transform: booleanAttribute });
  /** Text of the "Add all" button. */
  readonly addAllLabel = input('Add all');
  /** Skeleton pills and `loadingLabel` instead of the chips. */
  readonly loading = input(false, { transform: booleanAttribute });
  readonly loadingLabel = input('Suggesting…');
  /** How many skeleton pills while loading (0 to 6). */
  readonly skeletonCount = input(3, { transform: numberAttribute });
  /** Polite live message, for example "Tag signals added"; set it after an accept. */
  readonly announcement = input('');

  /** "Add all" was pressed: the feature applies every chip of the row. */
  readonly acceptAll = output<void>();

  protected readonly skeletons = computed(() =>
    Array.from(
      { length: Math.min(MAX_SKELETONS, Math.max(0, Math.floor(this.skeletonCount()) || 0)) },
      (_, i) => i,
    ),
  );
}
