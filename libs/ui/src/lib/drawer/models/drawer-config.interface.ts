/** Options of `DrawerService.open()`. */
export interface UiDrawerConfig<D = undefined> {
  /** Accessible name of the drawer (`aria-label`); the feature translates it. */
  readonly ariaLabel: string;
  /** Read in the drawer content with `injectDialogData<D>()`. */
  readonly data?: D;
}
