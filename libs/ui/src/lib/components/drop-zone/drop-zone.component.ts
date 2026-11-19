import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { BUTTON_SIZE } from '../button/models/button-size.const';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * A dashed drop target for one file to import (bookmarks, Pocket, Raindrop). Dropping is a
 * shortcut: the "choose" button is the keyboard and touch path, and opens a hidden native file
 * input. `fileSelected` emits the first file of a drop or a pick (more files are ignored). All
 * text comes in through inputs. While a file is dragged over, the border turns `accent` and the
 * fill `accent-bg`. A counter of dragenter / dragleave pairs stops child elements from flickering.
 */
@Component({
  selector: 'ui-drop-zone',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-drop-zone',
    '[class.ui-drop-zone--over]': 'dragOver() || over()',
    '[class.ui-drop-zone--disabled]': 'disabled()',
    '[class.ui-drop-zone--invalid]': 'invalid()',
    '(dragenter)': 'onDragEnter($event)',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
  templateUrl: './drop-zone.component.html',
  styleUrl: './drop-zone.component.scss',
})
export class DropZoneComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;

  /** Passed to the hidden file input (`.html,text/html`). */
  readonly accept = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Shows the dragging look while the feature sees a file over a larger area (a dialog that takes
   * the drop anywhere), so the zone answers "release here" before the pointer reaches it.
   */
  readonly over = input(false, { transform: booleanAttribute });
  /** Error border; the feature explains the error elsewhere. */
  readonly invalid = input(false, { transform: booleanAttribute });
  /** The text before the action ("Drop the file here or"). */
  readonly label = input('');
  /** The text of the button that opens the file picker ("Choose file"). */
  readonly actionLabel = input.required<string>();
  /** A small muted line under the label. */
  readonly hint = input('');

  /** The first file of a drop or a pick. */
  readonly fileSelected = output<File>();

  protected readonly dragOver = signal(false);

  private depth = 0;

  protected openPicker(input: HTMLInputElement): void {
    if (!this.disabled()) {
      input.click();
    }
  }

  protected onPick(input: HTMLInputElement): void {
    const file = input.files?.[0];
    // Reset so choosing the same file again fires `change`.
    input.value = '';
    if (file && !this.disabled()) {
      this.fileSelected.emit(file);
    }
  }

  protected onDragEnter(event: DragEvent): void {
    if (!this.isFileDrag(event)) {
      return;
    }
    event.preventDefault();
    this.depth += 1;
    this.dragOver.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.isFileDrag(event)) {
      return;
    }
    // Needed for the drop event to fire.
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  protected onDragLeave(event: DragEvent): void {
    if (!this.isFileDrag(event)) {
      return;
    }
    this.depth = Math.max(0, this.depth - 1);
    if (this.depth === 0) {
      this.dragOver.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    if (!this.isFileDrag(event)) {
      return;
    }
    event.preventDefault();
    this.depth = 0;
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  private isFileDrag(event: DragEvent): boolean {
    return !this.disabled() && Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
}
