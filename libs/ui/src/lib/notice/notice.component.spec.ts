import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import type { IconName } from '../icon/models/icon-name.type';
import type { NoticeKind } from './models/notice-kind.type';
import { NoticeComponent } from './notice.component';
import { NOTICE_KIND } from './models/notice-kind.const';

@Component({
  imports: [NoticeComponent],
  template: `
    <ui-notice [kind]="kind()" [icon]="icon()" [banner]="banner()"
      >Already saved. <a href="/links/1">Open the link</a>
      @if (action()) {
        <a uiNoticeAction href="/sign-in">Sign in</a>
      }
    </ui-notice>
  `,
})
class HostComponent {
  readonly kind = signal<NoticeKind>(NOTICE_KIND.Warning);
  readonly icon = signal<IconName | undefined>(undefined);
  readonly banner = signal(false);
  readonly action = signal(false);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const notice = host.querySelector('ui-notice') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { host, notice, update };
}

function iconHref(notice: HTMLElement): string {
  return notice.querySelector('use')?.getAttribute('href') ?? '';
}

describe('NoticeComponent', () => {
  it('is a warning status with the warning icon by default', () => {
    const { notice } = setup();
    expect(notice.classList.contains('ui-notice--warning')).toBe(true);
    expect(notice.getAttribute('role')).toBe('status');
    expect(iconHref(notice).endsWith('#sm-warning')).toBe(true);
  });

  it('danger is an alert with the error icon', () => {
    const { notice, update } = setup();
    update((c) => c.kind.set(NOTICE_KIND.Danger));
    expect(notice.classList.contains('ui-notice--danger')).toBe(true);
    expect(notice.classList.contains('ui-notice--warning')).toBe(false);
    expect(notice.getAttribute('role')).toBe('alert');
    expect(iconHref(notice).endsWith('#sm-error')).toBe(true);
  });

  it('takes an icon override', () => {
    const { notice, update } = setup();
    update((c) => c.icon.set('info'));
    expect(iconHref(notice).endsWith('#sm-info')).toBe(true);
  });

  it('projects text and a link; the icon is decorative', () => {
    const { notice } = setup();
    expect(notice.querySelector('.ui-notice__body')?.textContent).toContain('Already saved.');
    expect(notice.querySelector('.ui-notice__body a')?.getAttribute('href')).toBe('/links/1');
    expect(notice.querySelector('ui-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('info is a polite status in the accent tint with the info icon', () => {
    const { notice, update } = setup();
    update((c) => c.kind.set(NOTICE_KIND.Info));
    expect(notice.classList.contains('ui-notice--info')).toBe(true);
    expect(notice.getAttribute('role')).toBe('status');
    expect(iconHref(notice).endsWith('#sm-info')).toBe(true);
  });

  it('banner adds the modifier and hides the default icon, an explicit icon stays', () => {
    const { notice, update } = setup();
    update((c) => {
      c.kind.set(NOTICE_KIND.Info);
      c.banner.set(true);
    });
    expect(notice.classList.contains('ui-notice--banner')).toBe(true);
    expect(notice.querySelector('ui-icon')).toBeNull();
    update((c) => c.icon.set('info'));
    expect(notice.querySelector('ui-icon')).not.toBeNull();
  });

  it('projects the trailing action into its own slot', () => {
    const { notice, update } = setup();
    expect(notice.querySelector('.ui-notice__action a')).toBeNull();
    update((c) => c.action.set(true));
    expect(notice.querySelector('.ui-notice__action a')?.getAttribute('href')).toBe('/sign-in');
    expect(notice.querySelector('.ui-notice__body a[uiNoticeAction]')).toBeNull();
  });

  it('has no axe violations for both kinds', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.kind.set(NOTICE_KIND.Danger));
    expect(await axeViolations(host)).toEqual([]);
    update((c) => {
      c.kind.set(NOTICE_KIND.Info);
      c.banner.set(true);
      c.action.set(true);
    });
    expect(await axeViolations(host)).toEqual([]);
  });
});
