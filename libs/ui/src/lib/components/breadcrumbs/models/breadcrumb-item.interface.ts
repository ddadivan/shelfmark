/** One level of `ui-breadcrumbs`; `label` is already translated. */
export interface BreadcrumbItem {
  readonly label: string;
  /** Route of the level; the last item is the current page and needs none. */
  readonly href?: string;
}
