import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { fieldCounterId, fieldErrorId, fieldHintId } from './field-ids';

/**
 * The shared shell of every text-like field (`ui-input`, `ui-textarea`, later `ui-select` and
 * `ui-tag-input`): a visible label above, the bordered control box with the `field-focus` halo
 * (the projected native control goes inside), and a message row with hint, error and counter.
 *
 * The hosting field gives the control the id it passes as `controlId`, sets
 * `aria-describedby` with `fieldDescribedBy()` and `aria-invalid` itself. The error element is
 * a persistent polite live region (an error inserted already filled is often not announced);
 * while an error is shown the hint stays in the DOM for screen readers but is visually hidden,
 * the error takes its place in the row (spec).
 */
@Component({
  selector: 'ui-field-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-field-shell' },
  templateUrl: './field-shell.component.html',
  styleUrl: './field-shell.component.scss',
})
export class FieldShellComponent {
  /** Id of the native control inside; the label points at it. */
  readonly controlId = input.required<string>();
  /** Visible label, always shown above the control. */
  readonly label = input.required<string>();
  readonly hint = input('');
  /** Inline pill: the label is visually hidden and the box is a small pill. */
  readonly compact = input(false, { transform: booleanAttribute });
  /** Error message (already translated); an empty string means no error. */
  readonly error = input('');
  /** Error look (danger border) also without a message. */
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Counter text on the right of the row, for example `42 / 2000`. */
  readonly counter = input('');
  /** Visually hidden words after the counter for screen readers, for example "characters". */
  readonly counterLabel = input('');
  /** Monospace control text (URLs). */
  readonly mono = input(false, { transform: booleanAttribute });
  /** Top-aligned control box for multi-line controls. */
  readonly multiline = input(false, { transform: booleanAttribute });

  protected readonly hintId = computed(() => fieldHintId(this.controlId()));
  protected readonly errorId = computed(() => fieldErrorId(this.controlId()));
  protected readonly counterId = computed(() => fieldCounterId(this.controlId()));
  protected readonly hasMessage = computed(
    () => !!this.hint() || !!this.error() || !!this.counter(),
  );
}
