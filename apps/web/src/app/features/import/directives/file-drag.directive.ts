import { booleanAttribute, Directive, input, output } from '@angular/core';

/**
 * Lets a whole area take a dropped file (the import dialog, step 1a "Release to import"): reports
 * while a file is dragged over it (a depth counter keeps child elements from flickering) and emits
 * the first file of a drop. A drop the drop zone inside already took (`defaultPrevented`) is left
 * to it, so the file is read once. Only files count: a dragged link or text does nothing.
 */
@Directive({
  selector: '[appFileDrag]',
  host: {
    '(dragenter)': 'onEnter($event)',
    '(dragover)': 'onOver($event)',
    '(dragleave)': 'onLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class FileDragDirective {
  readonly disabled = input(false, { alias: 'appFileDragDisabled', transform: booleanAttribute });

  /** True while a file is over the area. */
  readonly draggingChange = output<boolean>();
  readonly fileDropped = output<File>();

  private depth = 0;

  protected onEnter(event: DragEvent): void {
    if (!this.isFileDrag(event)) return;
    event.preventDefault();
    this.depth += 1;
    if (this.depth === 1) this.draggingChange.emit(true);
  }

  protected onOver(event: DragEvent): void {
    if (!this.isFileDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onLeave(event: DragEvent): void {
    if (!this.isFileDrag(event)) return;
    this.depth = Math.max(0, this.depth - 1);
    if (this.depth === 0) this.draggingChange.emit(false);
  }

  protected onDrop(event: DragEvent): void {
    if (!this.isFileDrag(event)) return;
    const handled = event.defaultPrevented;
    event.preventDefault();
    this.depth = 0;
    this.draggingChange.emit(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && !handled) this.fileDropped.emit(file);
  }

  private isFileDrag(event: DragEvent): boolean {
    return !this.disabled() && Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
}
