import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { UiFieldControl } from '../field/field-control.directive';
import { FieldShellComponent } from '../field/field-shell.component';
import { TooltipDirective } from '../tooltip/tooltip.directive';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { SpinnerComponent } from '../spinner/spinner.component';
import type { InputType } from './models/input-type.type';
import { INPUT_TYPE } from './models/input-type.const';

/**
 * Single-line text field in the shared field shell. Bind it to Signal Forms with
 * `<ui-input label="Link" [formField]="form.url" />`: value, disabled, required, errors and
 * touched come from the field (a custom `FormValueControl`), and the first error message shows
 * once the field is touched. Without a form use `[(value)]` and `error`.
 *
 * The label is always visible (the placeholder only shows an example). `search` draws the search
 * icon by default and swaps it for `ui-spinner` in the same 16px slot while `loading`, so the
 * field never shifts; other types show the spinner after the text, in `--text-muted`, and the
 * text keeps its room. `clearable` shows a clear button (`clearLabel` is its accessible name)
 * that empties the field and keeps focus in it.
 */
@Component({
  selector: 'ui-input',
  imports: [TooltipDirective, FieldShellComponent, IconComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-input' },
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent extends UiFieldControl implements FormValueControl<string> {
  protected readonly INPUT_TYPE = INPUT_TYPE;

  readonly value = model('');
  readonly type = input<InputType>(INPUT_TYPE.Text);
  readonly placeholder = input('');
  /** Leading icon; `search` fields default to the search icon. */
  readonly icon = input<IconName>();
  /** Shows a clear button while the field has a value. */
  readonly clearable = input(false, { transform: booleanAttribute });
  /** Accessible name of the clear button; without it no clear button is rendered. */
  readonly clearLabel = input('');
  /** Keyboard shortcut hint on the right, for example `⌘K`. */
  readonly shortcut = input('');
  /**
   * Shows a spinner while true and sets `aria-busy`: `search` swaps its icon, other types show it
   * after the text (before the clear button).
   */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Announced while `loading` ("Searching", "Loading preview"); without it the spinner stays silent. */
  readonly loadingLabel = input('');

  private readonly native = viewChild.required<ElementRef<HTMLInputElement>>('native');

  protected readonly glyph = computed(
    () =>
      this.icon() ??
      (this.type() === INPUT_TYPE.Search ? ('search' satisfies IconName) : undefined),
  );
  protected readonly spinning = computed(() => this.type() === INPUT_TYPE.Search && this.loading());
  /** Other types: the spinner sits after the text, before the clear button. */
  protected readonly trailingSpinner = computed(
    () => this.type() !== INPUT_TYPE.Search && this.loading(),
  );
  protected readonly showClear = computed(
    () => this.clearable() && !!this.clearLabel() && !this.disabled() && this.value() !== '',
  );
  /** True after the first spinner: only then the returning icon animates in. */
  protected readonly iconReturns = signal(false);

  constructor() {
    super();
    effect(() => {
      if (this.spinning()) {
        this.iconReturns.set(true);
      }
    });
  }

  /** Focuses the native input (Signal Forms calls this to focus the first invalid field). */
  focus(options?: FocusOptions): void {
    this.native().nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected clear(): void {
    this.value.set('');
    this.focus();
  }
}
