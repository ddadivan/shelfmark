import { NgTemplateOutlet } from '@angular/common';
import {
  afterEveryRender,
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  isDevMode,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { UI_FOCUS_TARGET } from '../focus-target/models/ui-focus-target.const';
import type { UiFocusTarget } from '../focus-target/models/ui-focus-target.interface';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { RippleDirective } from '../ripple/ripple.directive';
import { SpinnerComponent } from '../spinner/spinner.component';
import type { ButtonHaspopup } from './models/button-haspopup.type';
import type { ButtonPressed } from './models/button-pressed.type';
import type { ButtonSize } from './models/button-size.type';
import type { ButtonType } from './models/button-type.type';
import type { ButtonVariant } from './models/button-variant.type';

/**
 * Triggers an action. Wraps a native `<button>`, so keyboard, focus and form behaviour are
 * the browser's; with `href` it wraps an `<a>` instead (same look, `linkClick` output for
 * routing). Content is the label text. `iconOnly` shows just an icon and requires
 * `ariaLabel`; in dev mode a missing one throws.
 *
 * Trigger API: the ARIA inputs land on the inner element, `focus()` / `element` expose it and
 * `UI_FOCUS_TARGET` lets directives on `<ui-button>` (tooltip, menu trigger) reach it.
 * A ripple plays from the touch point on the inner element (`ripple` opts out).
 *
 * `loading` is for an action the user started: the button locks its current width first (so
 * "Save link" to "Saving…" never makes it jump), shows a spinner that grows in while the label
 * makes room, sets `aria-busy="true"` and ignores activation (clicks, Enter, Space). The
 * width is released once the spinner has left. The feature changes the label to the -ing form.
 */
@Component({
  selector: 'ui-button',
  imports: [IconComponent, NgTemplateOutlet, RippleDirective, SpinnerComponent],
  providers: [{ provide: UI_FOCUS_TARGET, useExisting: ButtonComponent }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent implements UiFocusTarget {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly iconLeft = input<IconName>();
  readonly iconRight = input<IconName>();
  /** Shows only an icon (`iconLeft`, else `iconRight`). Requires `ariaLabel`. */
  readonly iconOnly = input(false, { transform: booleanAttribute });
  /** Accessible name; required for icon-only buttons. */
  readonly ariaLabel = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Busy: spinner, `aria-busy`, width locked, activation blocked. The button stays focusable. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Renders an inner `<a href>` instead of a `<button>` (`type` then does not apply). */
  readonly href = input<string>();
  /** Press ripple; `[ripple]="false"` opts out. */
  readonly ripple = input(true, { transform: booleanAttribute });
  /** `aria-expanded` of the inner element; unset renders no attribute. */
  readonly ariaExpanded = input<boolean>();
  readonly ariaControls = input<string>();
  readonly ariaHaspopup = input<ButtonHaspopup>();
  readonly ariaDescribedby = input<string>();
  readonly ariaPressed = input<ButtonPressed>();

  /**
   * Plain left click on the link (no modifier key). Call `preventDefault()` on the event to
   * route instead of navigating; middle and Cmd/Ctrl-click keep native behaviour.
   */
  readonly linkClick = output<MouseEvent>();

  private readonly control = viewChild<ElementRef<HTMLElement>>('control');
  /** The inner native `<button>` / `<a>`; `undefined` until rendered. */
  readonly element = computed(() => this.control()?.nativeElement);

  protected readonly isLink = computed(() => this.href() !== undefined);
  /** A link without `href` (disabled or busy): no navigation by middle click or context menu. */
  protected readonly inert = computed(() => this.disabled() || this.loading());
  protected readonly rippleActive = computed(
    () => this.ripple() && !this.disabled() && !this.loading(),
  );
  /** Width (px) the button keeps while it is loading and until the spinner has left. */
  protected readonly lockedWidth = signal<number | undefined>(undefined);
  protected readonly classes = computed(() => {
    const classes = ['ui-button', `ui-button--${this.variant()}`];
    if (this.size() !== 'md') {
      classes.push(`ui-button--${this.size()}`);
    }
    if (this.iconOnly()) {
      classes.push('ui-button--icon');
    }
    return classes.join(' ');
  });

  protected readonly iconSize = computed(() => (this.size() === 'lg' ? 20 : 16));
  protected readonly singleIcon = computed(() => this.iconLeft() ?? this.iconRight());

  private readonly injector = inject(Injector);
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver((entries) => {
          const entry = entries.at(-1);
          this.measureRestWidth(entry?.borderBoxSize?.[0]?.inlineSize ?? entry?.contentRect.width);
        });
  /** Last width measured while the button was at rest; the width to lock when loading starts. */
  private restWidth: number | undefined;
  private wasLoading = false;

  constructor() {
    // The label changes in the same change detection pass that sets `loading`, before any
    // effect or hook of this component can read the DOM, so the width to lock is recorded
    // beforehand: a ResizeObserver keeps it fresh (also across font loading); without one
    // (no layout engine) it is read after every render that is neither loading nor locked.
    if (this.resizeObserver) {
      const observer = this.resizeObserver;
      effect((onCleanup) => {
        const element = this.element();
        if (element) {
          observer.observe(element);
          onCleanup(() => observer.unobserve(element));
        }
      });
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    } else {
      afterEveryRender({ read: () => this.measureRestWidth(this.element()?.offsetWidth) });
    }
    // Busy: a capture-phase listener on the host stops the click before the inner element and
    // before listeners on `<ui-button>` (`(click)`), so nothing is activated and a submit
    // button does not submit. Capture listeners higher up (the CDK overlay's outside-press)
    // still see the event; `preventDefault()` also stops link navigation.
    const swallowClick = (event: Event): void => {
      if (this.loading()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const host = this.hostElement.nativeElement;
    host.addEventListener('click', swallowClick, { capture: true });
    inject(DestroyRef).onDestroy(() =>
      host.removeEventListener('click', swallowClick, { capture: true }),
    );
    effect(() => {
      const loading = this.loading();
      untracked(() => (loading ? this.lockWidth() : this.releaseWidthAfterSpinner()));
    });
    // Developer-error guard, dev mode only: production never throws over a missing label.
    if (isDevMode()) {
      effect(() => {
        if (this.iconOnly() && !this.ariaLabel()) {
          throw new Error('ui-button: iconOnly requires an ariaLabel.');
        }
      });
    }
  }

  /** Focuses the inner native element (not the non-focusable host). */
  focus(options?: FocusOptions): void {
    this.element()?.focus(options);
  }

  private measureRestWidth(width: number | undefined): void {
    if (!this.loading() && this.lockedWidth() === undefined) {
      this.restWidth = width || undefined;
    }
  }

  private lockWidth(): void {
    this.wasLoading = true;
    if (this.restWidth !== undefined) {
      this.lockedWidth.set(this.restWidth);
    }
  }

  /** Releases the locked width when the leaving spinner has finished its animations. */
  private releaseWidthAfterSpinner(): void {
    if (!this.wasLoading) {
      return;
    }
    this.wasLoading = false;
    // The spinner is still in the DOM here; the template removes it (`animate.leave`) next.
    const spinner = this.element()?.querySelector('ui-spinner');
    const release = (): void => {
      if (!this.loading()) {
        this.lockedWidth.set(undefined);
      }
    };
    afterNextRender(
      () => {
        const animations = spinner?.getAnimations?.() ?? [];
        if (animations.length === 0) {
          release();
        } else {
          void Promise.allSettled(animations.map((animation) => animation.finished)).then(release);
        }
      },
      { injector: this.injector },
    );
  }

  protected onLinkClick(event: MouseEvent): void {
    if (this.disabled()) {
      // A disabled link is inert: no navigation and no click for listeners on the host.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const plain =
      event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
    if (plain) {
      this.linkClick.emit(event);
    }
  }
}
