import type { DrawerSide } from './drawer-side.type';

/** Options of `DrawerService.open()`. */
export interface UiDrawerConfig<D = undefined> {
  /** Accessible name of the drawer (`aria-label`); the feature translates it. */
  readonly ariaLabel: string;
  /** The edge to pin the drawer to (default `start`); the content renders `<ui-drawer [side]>` with the same value. */
  readonly side?: DrawerSide;
  /** Read in the drawer content with `injectDialogData<D>()`. */
  readonly data?: D;
  /** Focus target when the opener is gone at close time, see `UiDialogConfig.restoreFocus`. */
  readonly restoreFocus?: () => HTMLElement | null;
}
