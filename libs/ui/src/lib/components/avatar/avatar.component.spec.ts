import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { axeViolations } from '../../../testing/axe';
import { AvatarComponent } from './avatar.component';
import { initialsOf } from './initials';
import type { AvatarSize } from './models/avatar-size.type';
import { AVATAR_SIZE } from './models/avatar-size.const';

@Component({
  imports: [AvatarComponent],
  template: `<ui-avatar [src]="src()" [name]="name()" [size]="size()" [label]="label()" />`,
})
class HostComponent {
  readonly src = signal<string | undefined>(undefined);
  readonly name = signal<string | undefined>('Dmytro Dadivan');
  readonly size = signal<AvatarSize>(AVATAR_SIZE.Md);
  readonly label = signal<string | undefined>(undefined);
}

@Component({
  imports: [AvatarComponent],
  template: `<button type="button" aria-label="Account menu">
    <ui-avatar name="Dmytro Dadivan" size="sm" />
  </button>`,
})
class ButtonHostComponent {}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const avatar = host.querySelector('ui-avatar') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { host, avatar, update };
}

function expectInitials(avatar: HTMLElement, letters: string): void {
  const el = avatar.querySelector('.ui-avatar__initials');
  expect(el?.getAttribute('data-initials')).toBe(letters);
  expect(el?.getAttribute('aria-hidden')).toBe('true');
  expect(el?.textContent).toBe('');
}

describe('initialsOf', () => {
  it.each([
    ['Dmytro Dadivan', 'DD'],
    ['ada', 'A'],
    ['  ada   lovelace  byron ', 'AB'],
    ['ελένη παπαδοπούλου', 'ΕΠ'],
    ['ßeta', 'S'],
    ['👩‍💻 Dev', '👩‍💻D'],
    ['émile zola', 'ÉZ'],
    ['', ''],
    ['   ', ''],
  ])('%j gives %j', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });

  it('handles null and undefined', () => {
    expect(initialsOf(undefined)).toBe('');
    expect(initialsOf(null)).toBe('');
  });
});

describe('AvatarComponent', () => {
  it('shows initials without an image and is decorative by default', () => {
    const { avatar } = setup();
    expectInitials(avatar, 'DD');
    expect(avatar.querySelector('img')).toBeNull();
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
    expect(avatar.hasAttribute('role')).toBe(false);
  });

  it('is a labelled image when label is set', () => {
    const { avatar, update } = setup();
    update((c) => c.label.set('Dmytro Dadivan'));
    expect(avatar.getAttribute('role')).toBe('img');
    expect(avatar.getAttribute('aria-label')).toBe('Dmytro Dadivan');
    expect(avatar.hasAttribute('aria-hidden')).toBe(false);
  });

  it.each<[AvatarSize, string]>([
    [AVATAR_SIZE.Sm, 'ui-avatar--sm'],
    [AVATAR_SIZE.Md, 'ui-avatar--md'],
    [AVATAR_SIZE.Lg, 'ui-avatar--lg'],
  ])('size %s adds %s', (size, cls) => {
    const { avatar, update } = setup();
    update((c) => c.size.set(size));
    expect(avatar.classList.contains(cls)).toBe(true);
  });

  it('shows the image with no-referrer and an empty alt', () => {
    const { avatar, update } = setup();
    update((c) => c.src.set('https://example.test/a.png'));
    const img = avatar.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://example.test/a.png');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(img.getAttribute('alt')).toBe('');
    expect(avatar.querySelector('.ui-avatar__initials')).toBeNull();
  });

  it('falls back to initials when the image fails, and retries on a new src', () => {
    const { avatar, update } = setup();
    update((c) => c.src.set('https://example.test/a.png'));
    avatar.querySelector('img')?.dispatchEvent(new Event('error'));
    update(() => undefined);
    expect(avatar.querySelector('img')).toBeNull();
    expectInitials(avatar, 'DD');
    update((c) => c.src.set('https://example.test/b.png'));
    expect(avatar.querySelector('img')?.getAttribute('src')).toBe('https://example.test/b.png');
  });

  it('shows a user icon without image and name', () => {
    const { avatar, update } = setup();
    update((c) => c.name.set(undefined));
    expect(avatar.querySelector('ui-icon')).not.toBeNull();
    update((c) => c.size.set(AVATAR_SIZE.Lg));
    expect(avatar.querySelector('ui-icon')?.classList.contains('ui-icon--24')).toBe(true);
  });

  it('passes label-content-name-mismatch inside a labelled button', async () => {
    const fixture = TestBed.createComponent(ButtonHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const results = await axe.run(host, {
      rules: {
        'color-contrast': { enabled: false },
        'label-content-name-mismatch': { enabled: true },
      },
    });
    expect(results.violations.map((v) => v.id)).toEqual([]);
    expect(host.querySelector('button')?.textContent?.trim()).toBe('');
  });

  it('has no axe violations decorative, labelled, with image and icon', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.label.set('Dmytro Dadivan'));
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.src.set('https://example.test/a.png'));
    expect(await axeViolations(host)).toEqual([]);
    update((c) => {
      c.src.set(undefined);
      c.name.set(undefined);
    });
    expect(await axeViolations(host)).toEqual([]);
  });
});
