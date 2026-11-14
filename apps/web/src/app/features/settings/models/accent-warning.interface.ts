/** A colour picked for the accent that would not keep 4.5:1, and the nearest shade that does. */
export interface AccentWarning {
  /** The picked colour, `#rrggbb`. */
  readonly colour: string;
  /** Its contrast on the current page and panels, formatted for the language ("2.3"). */
  readonly ratio: string;
  /** The nearest shade that keeps the accent rules, `#rrggbb`. */
  readonly shade: string;
}
