import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { describe, expect, it } from 'vitest';
import { ButtonComponent } from '../../button/button.component';
import { UiButtonHarness } from '../../button/testing/button.harness';
import { CardComponent } from '../card.component';
import { UiCardHarness } from './card.harness';
import { CARD_HARNESS_SLOT } from './models/card-harness-slot.const';

@Component({
  imports: [CardComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card
      href="https://angular.dev"
      newTab
      description="Opens in a new tab"
      [selected]="selected()"
      [checked]="checked()"
      favorited
      image="data:image/gif;base64,R0lGODlhAQABAAAAACw="
      [headingLevel]="3"
      (activated)="onActivated($event)"
    >
      <span slot="title">Angular docs</span>
      <span slot="meta">angular.dev</span>
      <ui-button slot="favorite" iconOnly iconLeft="star" ariaLabel="Favorite" />
      <ui-button slot="actions" iconOnly iconLeft="more" ariaLabel="More" />
    </ui-card>
    <ui-card (activated)="clicks.set(clicks() + 1)">
      <span slot="title">A note</span>
    </ui-card>
  `,
})
class HostComponent {
  readonly selected = signal(false);
  readonly checked = signal(false);
  readonly clicks = signal(0);
  readonly modifiers = signal<boolean[]>([]);

  onActivated(event: MouseEvent): void {
    event.preventDefault();
    this.modifiers.update((list) => [...list, event.ctrlKey || event.metaKey]);
  }
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  return { fixture, loader, host: fixture.componentInstance };
}

describe('UiCardHarness', () => {
  it('finds cards by title and selection and reads them', async () => {
    const { loader, host } = await setup();
    expect(await loader.getAllHarnesses(UiCardHarness)).toHaveLength(2);
    const card = await loader.getHarness(UiCardHarness.with({ title: 'Angular docs' }));
    expect(await card.getMetaText()).toBe('angular.dev');
    expect(await card.getHref()).toBe('https://angular.dev');
    expect(await card.opensInNewTab()).toBe(true);
    expect(await card.getDescription()).toBe('Opens in a new tab');
    expect(await card.getHeadingLevel()).toBe(3);
    expect(await card.isFavorited()).toBe(true);
    expect(await card.hasImage()).toBe(true);
    expect(await card.getImageSrc()).toContain('data:image/gif');
    expect(await card.isSelected()).toBe(false);
    expect(await card.isChecked()).toBe(false);
    host.selected.set(true);
    host.checked.set(true);
    expect(await card.isSelected()).toBe(true);
    expect(await card.isChecked()).toBe(true);
    expect(await loader.getAllHarnesses(UiCardHarness.with({ selected: true }))).toHaveLength(1);
    const note = await loader.getHarness(UiCardHarness.with({ title: /note/ }));
    expect(await note.getHref()).toBeNull();
    expect(await note.opensInNewTab()).toBe(false);
    expect(await note.getDescription()).toBeNull();
    expect(await note.getHeadingLevel()).toBe(2);
    expect(await note.isFavorited()).toBe(false);
    expect(await note.hasImage()).toBe(false);
    expect(await note.getImageSrc()).toBeNull();
  });

  it('clicks the title control, with modifiers, and focuses it', async () => {
    const { loader, host } = await setup();
    const card = await loader.getHarness(UiCardHarness.with({ title: 'Angular docs' }));
    await card.hover();
    await card.click();
    await card.click({ control: true });
    expect(host.modifiers()).toEqual([false, true]);
    const note = await loader.getHarness(UiCardHarness.with({ title: 'A note' }));
    await note.click();
    expect(host.clicks()).toBe(1);
    await note.focus();
    expect(await note.isFocused()).toBe(true);
  });

  it('loads projected controls by area', async () => {
    const { loader } = await setup();
    const card = await loader.getHarness(UiCardHarness.with({ title: 'Angular docs' }));
    const actions = await card.getChildLoader(CARD_HARNESS_SLOT.Actions);
    expect(await (await actions.getHarness(UiButtonHarness)).getName()).toBe('More');
    const favorite = await card.getChildLoader(CARD_HARNESS_SLOT.Favorite);
    expect(await (await favorite.getHarness(UiButtonHarness)).getName()).toBe('Favorite');
    expect(await card.getAllHarnesses(UiButtonHarness)).toHaveLength(2);
  });
});
