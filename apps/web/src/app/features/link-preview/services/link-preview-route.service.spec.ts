import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  LIBRARY_SETTINGS_DEFAULT,
  LINK_CLICK_ACTION,
  type LibrarySettings,
} from '@shelfmark/contracts';
import { ViewportService } from '../../../core/layout/viewport.service';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { LinkPreviewRoute } from './link-preview-route.service';

@Component({ selector: 'app-route-spec-page', template: '' })
class PageComponent {}

async function setup(wide = true, library: Partial<LibrarySettings> = {}) {
  const wideSignal = signal(wide);
  const librarySignal = signal<LibrarySettings>({ ...LIBRARY_SETTINGS_DEFAULT, ...library });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', component: PageComponent }]),
      provideLocationMocks(),
      { provide: ViewportService, useValue: { wide: wideSignal } },
      { provide: UserSettingsStore, useValue: { libraryShown: librarySignal } },
    ],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl('/links');
  const route = TestBed.inject(LinkPreviewRoute);
  const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);
  return { route, router, back, wideSignal, librarySignal };
}

describe('LinkPreviewRoute', () => {
  it('is closed without a preview parameter', async () => {
    const { route } = await setup();
    expect(route.currentId()).toBeNull();
    expect(route.isOpen()).toBe(false);
    expect(route.split()).toBe(false);
    expect(route.pushed()).toBe(false);
    expect(route.rail()).toBe(false);
  });

  it('follows the preview parameter of a navigation', async () => {
    const { route, router } = await setup();
    await router.navigateByUrl('/links?preview=abc');
    expect(route.currentId()).toBe('abc');
    expect(route.isOpen()).toBe(true);
  });

  it('opens as a split with the rail on a wide screen', async () => {
    const { route } = await setup(true);
    await route.open('abc');
    expect(route.currentId()).toBe('abc');
    expect(route.split()).toBe(true);
    expect(route.pushed()).toBe(false);
    expect(route.rail()).toBe(true);
  });

  it('opens as a pushed page below the wide breakpoint, with no rail', async () => {
    const { route } = await setup(false);
    await route.open('abc');
    expect(route.split()).toBe(false);
    expect(route.pushed()).toBe(true);
    expect(route.rail()).toBe(false);
  });

  it('drops the split and related parameters and keeps the others', async () => {
    const { route, router } = await setup();
    await router.navigateByUrl('/links?q=angular&split=folder-1&related=x');
    await route.open('abc');
    expect(router.url).toBe('/links?q=angular&preview=abc');
  });

  it('pushes a history entry for the first link and replaces it when switching', async () => {
    const { route, router } = await setup();
    const navigate = vi.spyOn(router, 'navigate');
    await route.open('a');
    await route.open('b');
    expect(navigate.mock.calls[0]?.[1]).toMatchObject({ replaceUrl: false });
    expect(navigate.mock.calls[1]?.[1]).toMatchObject({ replaceUrl: true });
    expect(route.currentId()).toBe('b');
  });

  it('goes Back on close when this app pushed the preview', async () => {
    const { route, back } = await setup();
    await route.open('a');
    await route.close();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('goes Back once only: a second close drops the parameter instead', async () => {
    const { route, router, back } = await setup();
    await route.open('a');
    await route.close();
    await route.close();
    expect(back).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/links');
  });

  it('removes the parameter on close when the page was reloaded on a preview', async () => {
    const { route, router, back } = await setup();
    await router.navigateByUrl('/links?preview=abc&q=x');
    await route.close();
    expect(back).not.toHaveBeenCalled();
    expect(router.url).toBe('/links?q=x');
    expect(route.isOpen()).toBe(false);
  });

  it('shows the full sidebar after "Show sidebar" until the preview closes', async () => {
    const { route, router } = await setup();
    await route.open('a');
    expect(route.rail()).toBe(true);
    route.showSidebar();
    expect(route.rail()).toBe(false);
    expect(route.split()).toBe(true);
    await router.navigateByUrl('/links?preview=a');
    await route.close();
    await route.open('b');
    expect(route.rail()).toBe(true);
  });

  describe('wantsPreview', () => {
    const URL = 'https://example.com/post';
    const click = (init: MouseEventInit = {}) => new MouseEvent('click', init);

    it('is false for a plain click while the setting opens the link', async () => {
      const { route } = await setup(true, { clickAction: LINK_CLICK_ACTION.Open });
      expect(route.wantsPreview(URL, click())).toBe(false);
    });

    it('is true for a plain click when the setting previews, and false with Ctrl or Meta', async () => {
      const { route } = await setup(true, { clickAction: LINK_CLICK_ACTION.Preview });
      expect(route.wantsPreview(URL, click())).toBe(true);
      expect(route.wantsPreview(URL, click({ ctrlKey: true }))).toBe(false);
      expect(route.wantsPreview(URL, click({ metaKey: true }))).toBe(false);
    });

    it('previews with Meta when the setting opens the link', async () => {
      const { route } = await setup(true, { clickAction: LINK_CLICK_ACTION.Open });
      expect(route.wantsPreview(URL, click({ metaKey: true }))).toBe(true);
    });

    it('treats a missing event as a plain click', async () => {
      const { route } = await setup(true, { clickAction: LINK_CLICK_ACTION.Preview });
      expect(route.wantsPreview(URL, undefined)).toBe(true);
    });

    it('is false below the wide breakpoint', async () => {
      const { route } = await setup(false, { clickAction: LINK_CLICK_ACTION.Preview });
      expect(route.wantsPreview(URL, click())).toBe(false);
    });

    it('skips a site the user opens in a new tab', async () => {
      const { route } = await setup(true, {
        clickAction: LINK_CLICK_ACTION.Preview,
        previewNewTabHosts: ['example.com'],
      });
      expect(route.wantsPreview(URL, click())).toBe(false);
    });

    it('switches an open preview with a plain click, whatever the setting says', async () => {
      const { route } = await setup(true, {
        clickAction: LINK_CLICK_ACTION.Open,
        previewNewTabHosts: ['example.com'],
      });
      await route.open('a');
      expect(route.wantsPreview(URL, click())).toBe(true);
    });

    it('follows a setting that changes', async () => {
      const { route, librarySignal } = await setup(true, { clickAction: LINK_CLICK_ACTION.Open });
      expect(route.wantsPreview(URL, click())).toBe(false);
      librarySignal.update((library) => ({ ...library, clickAction: LINK_CLICK_ACTION.Preview }));
      expect(route.wantsPreview(URL, click())).toBe(true);
    });
  });
});
