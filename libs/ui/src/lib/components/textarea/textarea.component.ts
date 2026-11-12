import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  input,
  model,
  numberAttribute,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { UiFieldControl } from '../field/field-control.directive';
import { FieldShellComponent } from '../field/field-shell.component';
import { TEXTAREA_MAX_ROWS } from './models/textarea-max-rows.const';

/**
 * Multi-line field, for example the note "why I saved it", in the shared field shell. Bind it
 * with `<ui-textarea label="Note" [formField]="form.note" />` (same contract as `ui-input`).
 * It starts at `rows` (3) and grows with its content up to 8 rows (CDK `cdkTextareaAutosize`),
 * then scrolls. With `maxLength` the right of the hint row shows a counter such as `42 / 2000`;
 * `counterLabel` adds the unit for screen readers.
 */
@Component({
  selector: 'ui-textarea',
  imports: [FieldShellComponent, CdkTextareaAutosize],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-textarea' },
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss',
})
export class TextareaComponent extends UiFieldControl implements FormValueControl<string> {
  readonly value = model('');
  readonly placeholder = input('');
  /** Rows shown when empty (minimum height). */
  readonly rows = input(3, { transform: numberAttribute });
  /**
   * Longest allowed text; shows the counter. No native cap: the Signal Forms `maxLength` rule
   * reports an overflow (typed, pasted or loaded) as an error. `[formField]` sets this input.
   */
  readonly maxLength = input<number | undefined>(undefined);
  /** Unit for screen readers after the counter, for example "characters". */
  readonly counterLabel = input('');
  /** The browser's spell-check (its own dictionary) while typing; on by default. */
  readonly spellcheck = input(true, { transform: booleanAttribute });

  protected readonly maxRows = TEXTAREA_MAX_ROWS;

  private readonly native = viewChild.required<ElementRef<HTMLTextAreaElement>>('native');
  private readonly autosize = viewChild(CdkTextareaAutosize);

  constructor() {
    super();
    // A value written by the form (reset, load) does not fire `input`; measure again.
    afterRenderEffect(() => {
      this.value();
      this.rows();
      this.autosize()?.resizeToFitContent(true);
    });
  }

  /** Focuses the native textarea. */
  focus(options?: FocusOptions): void {
    this.native().nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }

  protected override counterText(): string {
    const max = this.maxLength();
    return max === undefined ? '' : `${this.value().length} / ${max}`;
  }
}
