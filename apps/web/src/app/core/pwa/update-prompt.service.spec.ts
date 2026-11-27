import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_DURATION_MS, TOAST_KIND, type ToastOptions } from '@shelfmark/ui';
import { Subject } from 'rxjs';
import { LazyToastService } from '../toast/lazy-toast.service';
import { UpdatePromptService } from './update-prompt.service';

function ready(hash: string): VersionEvent {
  return {
    type: 'VERSION_READY',
    currentVersion: { hash: 'old' },
    latestVersion: { hash },
  };
}

function setup(isEnabled = true) {
  const versionUpdates = new Subject<VersionEvent>();
  const show = vi.fn<(options: ToastOptions) => void>();
  const reload = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: SwUpdate, useValue: { isEnabled, versionUpdates } },
      { provide: LazyToastService, useValue: { show } },
      { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      { provide: DOCUMENT, useValue: { location: { reload } } },
    ],
  });
  const service = TestBed.inject(UpdatePromptService);
  return { service, versionUpdates, show, reload };
}

describe('UpdatePromptService', () => {
  it('offers Reload and Later once a new version is ready, and never reloads by itself', () => {
    const { service, versionUpdates, show, reload } = setup();
    service.init();

    versionUpdates.next(ready('v2'));

    expect(show).toHaveBeenCalledTimes(1);
    const options = show.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      kind: TOAST_KIND.Info,
      title: 'update.available',
      duration: TOAST_DURATION_MS.Sticky,
      action: { label: 'update.reload' },
      secondary: { label: 'update.later' },
    });
    expect(reload).not.toHaveBeenCalled();

    options?.secondary?.run();
    expect(reload).not.toHaveBeenCalled();
    options?.action?.run();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('asks once per version, and again for a newer one', () => {
    const { service, versionUpdates, show } = setup();
    service.init();
    service.init();

    versionUpdates.next(ready('v2'));
    versionUpdates.next(ready('v2'));
    versionUpdates.next(ready('v3'));

    expect(show).toHaveBeenCalledTimes(2);
  });

  it('ignores the other version events', () => {
    const { service, versionUpdates, show } = setup();
    service.init();

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'v2' } });
    versionUpdates.next({ type: 'NO_NEW_VERSION_DETECTED', version: { hash: 'v1' } });

    expect(show).not.toHaveBeenCalled();
  });

  it('does nothing without a service worker', () => {
    const { service, versionUpdates, show } = setup(false);
    service.init();

    versionUpdates.next(ready('v2'));

    expect(show).not.toHaveBeenCalled();
  });
});
