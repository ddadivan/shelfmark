/** `share_target` of the web app manifest (Android share sheet). */
export interface WebShareTarget {
  readonly action: string;
  readonly method: string;
  readonly params: Record<string, string>;
}
