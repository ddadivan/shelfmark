import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, EmptyStateComponent, InputComponent, isMacPlatform } from '@shelfmark/ui';
import { BrowserExtensionService } from '../../../../core/browser-extension/browser-extension.service';
import { ImportDialogService } from '../../../import/services/import-dialog.service';
import { LinkActionsService } from '../../../links/services/link-actions.service';

/**
 * The empty library as the first run (Shelf 10-first-run "Empty library as first run"): the
 * gathering scene, "Your shelf is empty" and three ways to fill it as numbered cards: paste a link
 * (a field that opens Add link with what was pasted or typed), get the extension (its store page,
 * only where the extension is offered) and import bookmarks (the import page). Shown by All links
 * while the whole library is empty.
 */
@Component({
  selector: 'app-first-run',
  imports: [TranslocoPipe, ButtonComponent, EmptyStateComponent, InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './first-run.component.html',
  styleUrl: './first-run.component.scss',
})
export class FirstRunComponent {
  private readonly actions = inject(LinkActionsService);
  private readonly importer = inject(ImportDialogService);
  protected readonly extension = inject(BrowserExtensionService);

  protected readonly text = signal('');
  /** The paste keys in the card ("Ctrl V", "⌘V" on Apple). */
  protected readonly pasteKeys = isMacPlatform() ? '⌘V' : 'Ctrl V';

  /** A paste into the field opens Add link with it at once. */
  protected onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (pasted.trim()) {
      event.preventDefault();
      this.open(pasted);
    }
  }

  /** Enter in the field opens Add link with what was typed. */
  protected onEnter(event: Event): void {
    event.preventDefault();
    if (this.text().trim()) {
      this.open(this.text());
    }
  }

  protected openImport(): void {
    this.importer.open();
  }

  private open(text: string): void {
    this.text.set('');
    void this.actions.addLink({ text: text.trim() });
  }
}
