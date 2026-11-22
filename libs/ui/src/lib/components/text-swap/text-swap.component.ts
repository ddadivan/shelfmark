import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
} from '@angular/core';

/**
 * A short status text or button label that swaps with a blur (#562): when `text` changes the old
 * text blurs 4px and fades up 4px (120 ms) while the new one rises out of the blur (200 ms
 * `ease-out`). Both sit in one grid cell, so the box never jumps while they overlap. The first text
 * does not animate; a button that locks its width keeps the lock. Reduced motion (device or
 * Settings › Animations): a plain cross-fade. The text is rendered by interpolation.
 *
 * `shimmer` gives the text the loader sweep (`shimmer-text`); `--ui-text-swap-rest` is the colour at
 * rest (default `text-muted`; a tinted background sets a stronger one to keep 4.5:1).
 *
 * `<ui-button><ui-text-swap [text]="label()" /></ui-button>`
 */
@Component({
  selector: 'ui-text-swap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-text-swap' },
  templateUrl: './text-swap.component.html',
  styleUrl: './text-swap.component.scss',
})
export class TextSwapComponent {
  /** The current text; every change swaps it. */
  readonly text = input.required<string>();
  /** The text carries the loader shimmer. */
  readonly shimmer = input(false, { transform: booleanAttribute });

  /** Sticky `true` after the first change: the text that is there from the start never animates. */
  protected readonly swapping = linkedSignal<string, boolean>({
    source: this.text,
    computation: (text, previous) =>
      previous !== undefined && (previous.value || previous.source !== text),
  });

  /** One item, tracked by its text: a new text is a new element, the old one leaves. */
  protected readonly items = computed(() => [this.text()]);
}
