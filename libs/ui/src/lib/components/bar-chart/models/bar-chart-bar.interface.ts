/** One bar of `ui-bar-chart`; the texts are already translated. */
export interface BarChartBar {
  /** Short axis text under the bar ("14", "Mon"). */
  readonly label: string;
  /** A count, 0 or more; anything else draws as 0. */
  readonly value: number;
  /** Full text for the data table and the hover title ("14 Nov: 3 sign-ups"); the label otherwise. */
  readonly description?: string;
}
