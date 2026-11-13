import { afterNextRender, inject, Injector, Service, signal } from '@angular/core';
import { form, validate, type ValidationError } from '@angular/forms/signals';
import { KEYBOARD_KEY } from '@shelfmark/ui';
import { parsePastedLinks } from '../components/paste-many/parse-pasted-links';
import type { ParsedPaste } from '../components/paste-many/models/parsed-paste.interface';
import type { AddSeveralFormModel } from '../models/add-several-form-model.interface';
import { AddLinkFormService } from './add-link-form.service';

/**
 * The "several links" side of the add-link dialog (provided by the dialog component): the paste
 * that turns the dialog into the paste-many list, and the "Add several links" text area (#315)
 * whose text is read with the paste-many parser.
 */
@Service({ autoProvided: false })
export class AddSeveralLinksService {
  private readonly formState = inject(AddLinkFormService);
  private readonly injector = inject(Injector);

  /** What a paste with several links held; set, the paste-many list replaces the form. */
  readonly pasted = signal<ParsedPaste | null>(this.formState.handedOverMany);

  /**
   * "Add several links" (#315): a large text area replaces the single-link fields; pasting into
   * it or "Find links" reads the text with the paste-many parser and opens the same list.
   */
  readonly several = signal(false);
  private readonly severalModel = signal<AddSeveralFormModel>({ text: '' });
  readonly severalForm = form(
    this.severalModel,
    (path) => {
      validate(path.text, ({ value }): ValidationError.WithoutFieldTree | undefined =>
        value().trim() === ''
          ? { kind: 'required', message: this.formState.text('links.add.several.required') }
          : parsePastedLinks(value()).links.length === 0
            ? { kind: 'noLinks', message: this.formState.text('links.add.several.none') }
            : undefined,
      );
    },
    {
      submission: {
        action: async () => {
          this.openList(parsePastedLinks(this.severalModel().text));
        },
        onInvalid: () => {
          this.severalForm.text().focusBoundControl();
        },
      },
    },
  );

  /**
   * A paste into the address field: text with more than one link opens the paste-many list
   * instead of landing in the field. One link (or none) pastes as usual.
   */
  onUrlPaste(event: ClipboardEvent): void {
    if (this.formState.editing) {
      return;
    }
    const parsed = parsePastedLinks(event.clipboardData?.getData('text/plain') ?? '');
    if (parsed.links.length > 1) {
      event.preventDefault();
      this.pasted.set(parsed);
    }
  }

  /** Switches to the several-links text area and puts focus in it. */
  showSeveral(): void {
    this.several.set(true);
    afterNextRender(
      { read: () => this.severalForm.text().focusBoundControl() },
      { injector: this.injector },
    );
  }

  /** Back to one link, focus on the address field. */
  showSingle(): void {
    this.several.set(false);
    afterNextRender(
      { read: () => this.formState.form.url().focusBoundControl() },
      { injector: this.injector },
    );
  }

  /**
   * Pasting into the "several links" text area is plain text entry (#335): people paste more than
   * once and edit the text; only "Find links" (or Cmd / Ctrl + Enter) goes on to the list. Enter
   * alone is a new line.
   */
  onSeveralKeydown(event: KeyboardEvent): void {
    if (event.key === KEYBOARD_KEY.Enter && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      (event.currentTarget as HTMLFormElement).requestSubmit();
    }
  }

  private openList(parsed: ParsedPaste): void {
    if (parsed.links.length > 0) {
      this.pasted.set(parsed);
    }
  }
}
