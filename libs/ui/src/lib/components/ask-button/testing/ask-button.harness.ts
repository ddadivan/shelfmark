import { ComponentHarness } from '@angular/cdk/testing';

/** Harness for `ui-ask-button`: every query and action goes to the inner native `<button>`. */
export class UiAskButtonHarness extends ComponentHarness {
  static hostSelector = 'ui-ask-button';

  private readonly control = this.locatorFor('button');

  async click(): Promise<void> {
    return (await this.control()).click();
  }

  async getText(): Promise<string> {
    return (await this.control()).text();
  }

  async isDisabled(): Promise<boolean> {
    return (await this.control()).getProperty<boolean>('disabled');
  }
}
