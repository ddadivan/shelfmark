import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { THEME_PREFERENCE } from '@shelfmark/contracts';
import { DialogService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import type { ChangelogFeature } from '../../models/changelog-feature.interface';
import { CHANGELOG_ITEM_KIND } from '../../models/changelog-item-kind.const';
import { ThemeService } from '../../../../core/theme/theme.service';
import type { WhatsNewDialogData } from '../../models/whats-new-dialog-data.interface';
import { WhatsNewDialogComponent } from './whats-new-dialog.component';

@Component({ template: '' })
class EmptyComponent {}

const feature = (id: string, extra: Partial<ChangelogFeature> = {}): ChangelogFeature => ({
  kind: CHANGELOG_ITEM_KIND.Feature,
  id,
  titleKey: `changelog.items.${id}.title`,
  textKey: `changelog.items.${id}.text`,
  ...extra,
});

const SIDE = feature('sideBySide', {
  priority: 1,
  image: {
    light: '/media/whats-new/2.1.0/side-light.webp',
    dark: '/media/whats-new/2.1.0/side-dark.webp',
    width: 1600,
    height: 1000,
    altKey: 'changelog.items.sideBySide.alt',
  },
});

const entry = (item: ChangelogFeature) => ({ item, version: '2.1.0', date: '2026-12-01' });

const DATA: WhatsNewDialogData = {
  highlights: [
    entry(SIDE),
    entry(feature('folderStyle', { priority: 2 })),
    entry(feature('domainRules', { priority: 3 })),
    entry(feature('reminders', { priority: 4 })),
  ],
  moreCount: 6,
};

async function open(data: WhatsNewDialogData = DATA, dark = false) {
  TestBed.configureTestingModule({
    imports: [EmptyComponent],
    providers: [
      provideRouter([{ path: '**', component: EmptyComponent }]),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
    ],
  });
  if (dark) {
    TestBed.inject(ThemeService).setPreference(THEME_PREFERENCE.Dark);
  }
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(EmptyComponent);
  const ref = TestBed.inject(DialogService).open<
    WhatsNewDialogComponent,
    undefined,
    WhatsNewDialogData
  >(WhatsNewDialogComponent, { data });
  await fixture.whenStable();
  const panel = document.querySelector<HTMLElement>('app-whats-new-dialog');
  if (!panel) throw new Error('dialog not open');
  return { ref, panel };
}

function button(panel: HTMLElement, text: string): HTMLButtonElement {
  const found = [...panel.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
  if (!found) throw new Error(`no button ${text}`);
  return found;
}

describe('WhatsNewDialogComponent', () => {
  afterEach(() => document.body.replaceChildren());

  it('shows the priority 1 feature large with its screenshot, then the others in order', async () => {
    const { panel } = await open();

    expect(panel.querySelector('h2')?.textContent?.trim()).toBe("What's new in Shelfmark");
    expect([...panel.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual([
      'Side by side',
      'Folder styling',
      'Rules by site',
      'Reminders',
    ]);
    expect(panel.querySelector('.whats-new__top h3')?.textContent?.trim()).toBe('Side by side');
    const images = panel.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]?.getAttribute('src')).toBe('/media/whats-new/2.1.0/side-light.webp');
    expect(images[0]?.getAttribute('alt')).toBe('Two feeds next to each other in Shelfmark.');
    expect(panel.querySelectorAll('.whats-new__item')).toHaveLength(3);
  });

  it('uses the screenshot of the dark theme', async () => {
    const { panel } = await open(DATA, true);

    expect(panel.querySelector('img')?.getAttribute('src')).toBe(
      '/media/whats-new/2.1.0/side-dark.webp',
    );
  });

  it('ends with "And N more improvements and fixes" linking to /changelog', async () => {
    const { panel } = await open();

    const more = panel.querySelector<HTMLAnchorElement>('.whats-new__more');
    expect(more?.textContent?.trim()).toBe('And 6 more improvements and fixes');
    expect(more?.getAttribute('href')).toBe('/changelog');
  });

  it('leaves the line out when nothing else is left, and uses the singular for one', async () => {
    const none = await open({ ...DATA, moreCount: 0 });
    expect(none.panel.querySelector('.whats-new__more')).toBeNull();
    document.body.replaceChildren();
    TestBed.resetTestingModule();

    const one = await open({ ...DATA, moreCount: 1 });
    expect(one.panel.querySelector('.whats-new__more')?.textContent?.trim()).toBe(
      'And 1 more improvement or fix',
    );
  });

  it('"See all changes" closes and opens /changelog; "Got it" just closes', async () => {
    const { ref, panel } = await open();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    button(panel, 'See all changes').click();
    await ref.result;

    expect(navigate).toHaveBeenCalledWith('/changelog');
  });

  it('closes with "Got it"', async () => {
    const { ref, panel } = await open();

    button(panel, 'Got it').click();

    await expect(ref.result).resolves.toBeUndefined();
  });

  it('has no axe violations', async () => {
    const { panel } = await open();

    expect(await axeViolations(panel)).toEqual([]);
  });
});
