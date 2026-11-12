/**
 * One option of `ui-theme-picker`. `label` is already translated: the accessible name, and the
 * visible caption of theme and background options. The other fields are the theme attributes the
 * drawing is rendered under (`data-theme`, `data-custom-*`); `theme: 'system'` draws half light,
 * half dark. Leave a field out to inherit it from the page.
 */
export interface ThemePickerOption {
  readonly value: string;
  readonly label: string;
  /** `light`, `dark`, `custom` or `system`. */
  readonly theme?: string;
  readonly base?: string;
  readonly accent?: string;
  readonly background?: string;
  readonly corners?: string;
  /**
   * Token values the drawing sets as custom properties (an own accent colour of the Custom theme,
   * `customAccentTokens()`); they win over the attributes. Bound through CSSOM, so the CSP holds.
   */
  readonly tokens?: Readonly<Record<string, string>>;
}
