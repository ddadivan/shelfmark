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
    <ui-notice [kind]="kind()" [icon]="icon()"
      >Already saved. <a href="/links/1">Open the link</a></ui-notice
    >
  `,
})
class HostComponent {
  readonly kind = signal<NoticeKind>(NOTICE_KIND.Warning);
  readonly icon = signal<IconName | undefined>(undefined);
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

  it('has no axe violations for both kinds', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.kind.set(NOTICE_KIND.Danger));
    expect(await axeViolations(host)).toEqual([]);
  });
});
