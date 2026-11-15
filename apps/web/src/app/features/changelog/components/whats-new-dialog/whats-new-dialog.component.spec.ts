import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { DialogService, ReducedMotion } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { signal } from '@angular/core';
import { axeViolations } from '../../../../../testing/axe';
import { AppTranslocoLoader } from '../../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../../core/i18n/transloco.config';
import type { ChangelogFeature } from '../../models/changelog-feature.interface';
import { CHANGELOG_ITEM_KIND } from '../../models/changelog-item-kind.const';
import type { WhatsNewDialogData } from '../../models/whats-new-dialog-data.interface';
import { WhatsNewDialogComponent } from './whats-new-dialog.component';

@Component({ template: '' })
class EmptyComponent {}

const feature = (id: string, extra: Partial<ChangelogFeature> = {}): ChangelogFeature => ({
  kind: CHANGELOG_ITEM_KIND.Feature,
  id,
  titleKey: `changelog.items.${id}.title`,
  textKey: `changelog.items.${id}.text`,
  highlight: true,
  ...extra,
});

const DATA: WhatsNewDialogData = {
  highlights: [
    { item: feature('trash'), version: '2.0.0', date: '2026-11-14' },
    {
      item: feature('sharing', {
        image: { src: '/media/whats-new/share.webp', width: 640, height: 360 },
      }),
      version: '2.0.0',
      date: '2026-11-14',
    },
    {
      item: feature('sideBySide', {
        video: {
          src: '/media/whats-new/side.mp4',
          poster: '/media/whats-new/side.webp',
          width: 640,
          height: 360,
        },
      }),
      version: '2.1.0',
      date: '2026-12-01',
    },
  ],
};

async function open(reduced = false) {
  const motion = { reduced: signal(reduced) };
  TestBed.configureTestingModule({
    imports: [EmptyComponent],
    providers: [
      provideRouter([{ path: '**', component: EmptyComponent }]),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: ReducedMotion, useValue: motion },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const fixture = TestBed.createComponent(EmptyComponent);
  const ref = TestBed.inject(DialogService).open<
    WhatsNewDialogComponent,
    undefined,
    WhatsNewDialogData
  >(WhatsNewDialogComponent, { data: DATA });
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

  it('lists each highlight with its title, text and media', async () => {
    const { panel } = await open();

    expect(panel.querySelector('h2')?.textContent?.trim()).toBe("What's new in Shelfmark");
    expect([...panel.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual([
      'Trash',
      'Share a folder',
      'Side by side',
    ]);
    expect(panel.querySelector('img')?.getAttribute('src')).toBe('/media/whats-new/share.webp');
    const video = panel.querySelector('video');
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video?.getAttribute('poster')).toBe('/media/whats-new/side.webp');
  });

  it('shows the poster instead of the loop under reduced motion', async () => {
    const { panel } = await open(true);

    expect(panel.querySelector('video')).toBeNull();
    expect([...panel.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toContain(
      '/media/whats-new/side.webp',
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
