/** One choice of `ui-select`; `children` nest it (a folder inside a folder). */
export interface SelectOption {
  /** Value written to the form when the option is chosen. */
  readonly id: string;
  /** Visible name. */
  readonly name: string;
  readonly children?: readonly SelectOption[];
}
