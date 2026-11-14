/** The fixed colours of one Custom theme base that an own accent colour must read against. */
export interface CustomThemeSurfaces {
  readonly surface: string;
  readonly surfaceHover: string;
  readonly surfacePressed: string;
  readonly text: string;
  readonly textMuted: string;
  /** Page background by name (the contracts' `CUSTOM_THEME_BACKGROUNDS` of the base). */
  readonly backgrounds: Readonly<Record<string, string>>;
}
