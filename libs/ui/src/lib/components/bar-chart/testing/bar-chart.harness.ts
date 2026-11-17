import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import type { BarChartHarnessFilters } from './models/bar-chart-harness-filters.interface';
import type { BarChartHarnessRow } from './models/bar-chart-harness-row.interface';

/** Harness for `ui-bar-chart`: reads what assistive technology gets (name, data table). */
export class UiBarChartHarness extends ComponentHarness {
  static hostSelector = 'ui-bar-chart';

  static with(options: BarChartHarnessFilters = {}): HarnessPredicate<UiBarChartHarness> {
    return new HarnessPredicate(UiBarChartHarness, options).addOption(
      'label',
      options.label,
      (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label),
    );
  }

  private readonly figure = this.locatorFor('.ui-bar-chart__figure');
  private readonly caption = this.locatorFor('.ui-bar-chart__table caption');
  private readonly rowHeads = this.locatorForAll('.ui-bar-chart__table tbody th');
  private readonly cells = this.locatorForAll('.ui-bar-chart__table tbody td');

  /** The table caption, which is the `label` input. */
  async getLabel(): Promise<string> {
    return (await (await this.caption()).text()).trim();
  }

  /** The accessible name of the figure: the label plus the summary. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.figure()).getAttribute('aria-label');
  }

  /** Every bar as a table row, left to right. */
  async getRows(): Promise<BarChartHarnessRow[]> {
    const [heads, cells] = await Promise.all([this.rowHeads(), this.cells()]);
    return Promise.all(
      heads.map(async (head, index) => ({
        text: (await head.text()).trim(),
        value: Number((await cells[index]?.text())?.trim() ?? 0),
      })),
    );
  }
}
