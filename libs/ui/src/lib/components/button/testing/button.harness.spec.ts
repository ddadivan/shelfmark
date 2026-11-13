import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { describe, expect, it } from 'vitest';
import { ButtonComponent } from '../button.component';
import { BUTTON_VARIANT } from '../models/button-variant.const';
import { UiButtonHarness } from './button.harness';

@Component({
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-button variant="primary" (click)="clicks.set(clicks() + 1)">Save</ui-button>
    <ui-button variant="ghost" iconOnly iconLeft="close" ariaLabel="Close" />
    <ui-button [disabled]="true">Locked</ui-button>
    <ui-button [loading]="true">Saving</ui-button>
    <ui-button [ariaExpanded]="expanded()" [ariaPressed]="true">Filters</ui-button>
    <ui-button href="/settings" (linkClick)="onLink($event)">Settings</ui-button>
  `,
})
class HostComponent {
  readonly clicks = signal(0);
  readonly links = signal(0);
  readonly expanded = signal(false);

  onLink(event: MouseEvent): void {
    event.preventDefault();
    this.links.update((n) => n + 1);
  }
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  return { fixture, loader, host: fixture.componentInstance };
}

describe('UiButtonHarness', () => {
  it('finds buttons by text, label, name, variant and disabled state', async () => {
    const { loader } = await setup();
    expect(await loader.getAllHarnesses(UiButtonHarness)).toHaveLength(6);
    expect(
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Save' }))).getVariant(),
    ).toBe(BUTTON_VARIANT.Primary);
    const close = await loader.getHarness(UiButtonHarness.with({ label: 'Close' }));
    expect(await close.getText()).toBe('');
    expect(await close.getName()).toBe('Close');
    expect(await loader.getAllHarnesses(UiButtonHarness.with({ name: /^S/ }))).toHaveLength(3);
    expect(
      await loader.getAllHarnesses(UiButtonHarness.with({ variant: BUTTON_VARIANT.Ghost })),
    ).toHaveLength(1);
    const disabled = await loader.getAllHarnesses(UiButtonHarness.with({ disabled: true }));
    expect(await Promise.all(disabled.map((b) => b.getText()))).toEqual(['Locked']);
  });

  it('clicks, focuses and blurs the inner control', async () => {
    const { loader, host } = await setup();
    const save = await loader.getHarness(UiButtonHarness.with({ text: 'Save' }));
    await save.click();
    expect(host.clicks()).toBe(1);
    await save.focus();
    expect(await save.isFocused()).toBe(true);
    await save.blur();
    expect(await save.isFocused()).toBe(false);
  });

  it('reads loading, expanded, pressed and the disabled state', async () => {
    const { loader, host } = await setup();
    expect(
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Saving' }))).isLoading(),
    ).toBe(true);
    const filters = await loader.getHarness(UiButtonHarness.with({ text: 'Filters' }));
    expect(await filters.isExpanded()).toBe(false);
    host.expanded.set(true);
    expect(await filters.isExpanded()).toBe(true);
    expect(await filters.getPressed()).toBe('true');
    const save = await loader.getHarness(UiButtonHarness.with({ text: 'Save' }));
    expect(await save.isExpanded()).toBeNull();
    expect(await save.getPressed()).toBeNull();
    expect(await save.isLoading()).toBe(false);
    expect(await save.isDisabled()).toBe(false);
    expect(
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Locked' }))).isDisabled(),
    ).toBe(true);
  });

  it('reads a link button and clicks it', async () => {
    const { loader, host } = await setup();
    const link = await loader.getHarness(UiButtonHarness.with({ text: 'Settings' }));
    expect(await link.isLink()).toBe(true);
    expect(await link.getHref()).toBe('/settings');
    await link.click();
    expect(host.links()).toBe(1);
    const save = await loader.getHarness(UiButtonHarness.with({ text: 'Save' }));
    expect(await save.isLink()).toBe(false);
    expect(await save.getHref()).toBeNull();
  });
});
