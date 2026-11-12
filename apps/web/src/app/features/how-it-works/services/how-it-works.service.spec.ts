import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AuthUser } from '@shelfmark/contracts';
import { DialogService } from '@shelfmark/ui';
import { AuthStore } from '../../../core/auth/auth.store';
import { HowItWorksService } from './how-it-works.service';
import { HowItWorksDialogComponent } from '../components/how-it-works-dialog/how-it-works-dialog.component';
import { HOW_IT_WORKS_STORAGE_PREFIX } from '../models/how-it-works-card.const';

const USER = { id: 'u1', isDemo: false } as AuthUser;
const DAY = 86_400_000;

function setup(user: AuthUser | null = USER) {
  const open = vi.fn(() => ({ result: Promise.resolve(undefined) }));
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: { user: signal(user) } },
      { provide: DialogService, useValue: { open } },
    ],
  });
  return { service: TestBed.inject(HowItWorksService), open };
}

const key = HOW_IT_WORKS_STORAGE_PREFIX + USER.id;

describe('HowItWorksService', () => {
  afterEach(() => localStorage.clear());

  it('shows the card to a new account and remembers when it was first seen', () => {
    const { service } = setup();

    expect(service.cardVisible()).toBe(true);
    expect(JSON.parse(localStorage.getItem(key) ?? '{}')).toEqual(
      expect.objectContaining({ done: false }),
    );
  });

  it('hides the card after two weeks', () => {
    localStorage.setItem(
      key,
      JSON.stringify({ firstSeen: new Date(Date.now() - 15 * DAY).toISOString(), done: false }),
    );
    const { service } = setup();

    expect(service.cardVisible()).toBe(false);
  });

  it('hides the card for good when hidden or when the video is opened', async () => {
    const first = setup();
    first.service.hideCard();
    expect(first.service.cardVisible()).toBe(false);

    localStorage.clear();
    TestBed.resetTestingModule();
    const second = setup();
    await second.service.open();
    expect(second.open).toHaveBeenCalledWith(HowItWorksDialogComponent, expect.anything());
    expect(second.service.cardVisible()).toBe(false);
  });

  it('never shows the card to a guest or a demo user', () => {
    expect(setup(null).service.cardVisible()).toBe(false);
    TestBed.resetTestingModule();
    expect(setup({ ...USER, isDemo: true }).service.cardVisible()).toBe(false);
  });

  it('treats broken stored state as a fresh start', () => {
    localStorage.setItem(key, '{oops');
    expect(setup().service.cardVisible()).toBe(true);
  });
});
