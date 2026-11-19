import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ChipComponent } from '../../chip/chip.component';
import { PopoverTriggerDirective } from '../../../directives/popover-trigger/popover-trigger.directive';
import { PopoverComponent } from '../popover.component';
import { UiPopoverHarness } from './popover.harness';

@Component({
  imports: [ChipComponent, PopoverComponent, PopoverTriggerDirective],
  template: `
    <ui-chip clickable variant="neutral" [uiPopoverTrigger]="pop">+2</ui-chip>
    <ui-popover #pop heading="All tags"><p>angular, video</p></ui-popover>
    <ui-popover heading="Other"><p>never opened</p></ui-popover>
  `,
})
class HostComponent {}

describe('UiPopoverHarness', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('opens through its trigger, reads the heading and closes with Esc', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    const popovers = await loader.getAllHarnesses(UiPopoverHarness);
    expect(popovers).toHaveLength(2);
    const popover = popovers[0] as UiPopoverHarness;

    expect(await popover.isOpen()).toBe(false);
    expect(await popover.getHeading()).toBe('');
    await popover.open();
    expect(await popover.isOpen()).toBe(true);
    expect(await popover.isTriggerExpanded()).toBe(true);
    expect(await popover.getHeading()).toBe('All tags');
    expect(await (await popover.host()).text()).toContain('angular, video');
    await popover.open();
    expect(await popover.isOpen()).toBe(true);

    expect(
      await loader.getAllHarnesses(UiPopoverHarness.with({ heading: 'All tags' })),
    ).toHaveLength(1);

    await popover.close();
    expect(await popover.isTriggerExpanded()).toBe(false);
    await popover.close();
  });
});
