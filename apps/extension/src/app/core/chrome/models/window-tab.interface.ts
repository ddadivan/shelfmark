/** A tab of the current window; `url` and `title` are absent without the `tabs` permission. */
export interface WindowTab {
  id: number;
  active: boolean;
  url: string | null;
  title: string;
  favIconUrl: string | null;
}
