import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';
import { CHOICE_GRID_KIND } from '../models/choice-grid-kind.const';
import type { ChoiceGridKind } from '../models/choice-grid-kind.type';
import { UiChoiceHarness } from './choice.harness';
import type { ChoiceGridHarnessFilters } from './models/choice-grid-harness-filters.interface';
import type { ChoiceHarnessFilters } from './models/choice-harness-filters.interface';

/** Harness for `ui-choice-grid` (folder colours, icons, own colours). */
export class UiChoiceGridHarness extends ComponentHarness {
  static hostSelector = 'ui-choice-grid';

  static with(options: ChoiceGridHarnessFilters = {}): HarnessPredicate<UiChoiceGridHarness> {
    return new HarnessPredicate(UiChoiceGridHarness, options).addOption(
      'label',
      options.label,
      (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label),
    );
  }

  async getLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  async getKind(): Promise<ChoiceGridKind> {
    return (await (await this.host()).hasClass('ui-choice-grid--icon'))
      ? CHOICE_GRID_KIND.Icon
      : CHOICE_GRID_KIND.Swatch;
  }

  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-disabled')) === 'true';
  }

  async getChoices(filters: ChoiceHarnessFilters = {}): Promise<UiChoiceHarness[]> {
    return this.locatorForAll(UiChoiceHarness.with(filters))();
  }

  /** Labels of the options, in order. */
  async getLabels(): Promise<string[]> {
    return Promise.all((await this.getChoices()).map((choice) => choice.getLabel()));
  }

  /** The checked option, `null` when the value matches none. */
  async getSelected(): Promise<UiChoiceHarness | null> {
    return this.locatorForOptional(UiChoiceHarness.with({ checked: true }))();
  }

  /** Selects the first option that matches. */
  async select(filters: ChoiceHarnessFilters): Promise<void> {
    return (await this.locatorFor(UiChoiceHarness.with(filters))()).select();
  }
}
