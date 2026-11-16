import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';

/**
 * The cover of a folder that is not highlighted (#440): a small decorative picture beside the
 * folder title, a link preview of the folder (same-origin path). It draws nothing when the picture
 * fails, so a broken link never leaves a hole in the header.
 */
@Component({
  selector: 'app-folder-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.folder-cover--failed]': 'failed()' },
  template: `
    @if (!failed()) {
      <img
        class="folder-cover__image"
        alt=""
        decoding="async"
        referrerpolicy="no-referrer"
        [src]="src()"
        (error)="failed.set(true)"
      />
    }
  `,
  styleUrl: './folder-cover.component.scss',
})
export class FolderCoverComponent {
  /** A same-origin picture URL. */
  readonly src = input.required<string>();

  /** The picture failed to load; reset when another one is given. */
  protected readonly failed = linkedSignal({ source: this.src, computation: () => false });
}
