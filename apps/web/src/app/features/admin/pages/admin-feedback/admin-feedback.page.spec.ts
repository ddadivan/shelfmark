import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { signal } from '@angular/core';
import { axeViolations } from '../../../../../testing/axe';
import { adminFeedbackMessage } from '../../../../../testing/feedback-message';
import { adminApiStub } from '../../../../../testing/admin-api-stub';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { ADMIN_API } from '../../models/admin-api.const';
import type { AdminApi } from '../../models/admin-api.interface';
import AdminFeedbackPage from './admin-feedback.page';

const FIRST = adminFeedbackMessage({
  id: 'a',
  text: 'Sort by last opened',
  user: { name: 'Ada Lovelace', email: 'ada@example.com' },
  screenshotUrls: ['/api/admin/feedback/a/screenshots/0', '/api/admin/feedback/a/screenshots/1'],
});
const SECOND = adminFeedbackMessage({
  id: 'b',
  text: 'Preview is missing',
  kind: 'problem',
  status: 'planned',
  reply: 'Soon',
  user: { name: 'Grace Hopper', email: 'grace@example.com' },
});

async function setup(overrides: Partial<AdminApi> = {}) {
  const api: AdminApi = {
    ...adminApiStub(true),
    listFeedback: vi.fn(() => Promise.resolve({ items: [FIRST, SECOND], nextCursor: null })),
    updateFeedback: vi.fn((id: string, request) =>
      Promise.resolve({
        ...(id === 'a' ? FIRST : SECOND),
        ...request,
        reply: request.reply ?? null,
      }),
    ),
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/feedback', component: AdminFeedbackPage }]),
      provideTranslocoForTest(),
      { provide: ADMIN_API, useValue: api },
      {
        provide: ViewportService,
        useValue: { phone: signal(false), compact: signal(false), desktop: signal(true) },
      },
    ],
  });
  await loadEnglish();
  const harness = await RouterTestingHarness.create('/admin/feedback');
  await harness.fixture.whenStable();
  return { api, harness, root: harness.routeNativeElement as HTMLElement };
}

function text(element: Element | null | undefined): string {
  return element?.textContent?.replace(/\s+/g, ' ') ?? '';
}

describe('AdminFeedbackPage', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.replaceChildren();
    });
  });

  it('lists every message with kind, user name and email, status and every screenshot', async () => {
    const { root } = await setup();
    const items = Array.from(root.querySelectorAll('.admin-feedback__list > li'));

    expect(root.querySelector('h1')?.textContent).toContain('Feedback inbox');
    expect(items).toHaveLength(2);
    const first = text(items[0]);
    expect(first).toContain('Idea');
    expect(first).toContain('Ada Lovelace');
    expect(first).toContain('ada@example.com');
    expect(first).toContain('Sort by last opened');
    expect(first).toContain('Received');
    const links = Array.from(items[0]?.querySelectorAll('a') ?? []);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/api/admin/feedback/a/screenshots/0',
      '/api/admin/feedback/a/screenshots/1',
    ]);
    expect(links[0]?.getAttribute('rel')).toContain('noopener');
    const images = Array.from(items[0]?.querySelectorAll('img') ?? []);
    expect(images.map((image) => image.getAttribute('src'))).toEqual([
      '/api/admin/feedback/a/screenshots/0',
      '/api/admin/feedback/a/screenshots/1',
    ]);
    expect(images[1]?.getAttribute('alt')).toBe('Open screenshot 2 of 2');
    expect(items[1]?.querySelector('a')).toBeNull();
    expect(items[1]?.querySelector('textarea')?.value).toBe('Soon');
  });

  it('asks the API for the first page of 20, then filters by the chosen status', async () => {
    const { api, root } = await setup();
    expect(api.listFeedback).toHaveBeenCalledWith({ limit: 20 });

    const filter = root.querySelector('.admin-feedback__filter button');
    filter?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.querySelector('[role="option"]')).not.toBeNull();
    });
    const planned = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (option) => option.textContent?.includes('Planned'),
    );
    planned?.click();

    await vi.waitFor(() => {
      expect(api.listFeedback).toHaveBeenLastCalledWith({ limit: 20, status: 'planned' });
    });
  });

  it('saves a reply with only the changed field and shows it', async () => {
    const { api, root, harness } = await setup();
    const item = root.querySelector('li');
    const save = item?.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save?.disabled).toBe(true);

    const reply = item?.querySelector('textarea');
    if (!reply) {
      throw new Error('No reply field');
    }
    reply.value = '  Thanks, planned  ';
    reply.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(save?.disabled).toBe(false);
    save?.click();
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(api.updateFeedback).toHaveBeenCalledWith('a', { reply: 'Thanks, planned' });
    });
  });

  it('clears a reply with null when the field is emptied', async () => {
    const { api, root, harness } = await setup();
    const item = root.querySelectorAll('.admin-feedback__list > li')[1];
    const reply = item?.querySelector('textarea');
    if (!reply) {
      throw new Error('No reply field');
    }
    reply.value = '';
    reply.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    item?.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();

    await vi.waitFor(() => {
      expect(api.updateFeedback).toHaveBeenCalledWith('b', { reply: null });
    });
  });

  it('shows the empty state, an error with Try again and Load more', async () => {
    const empty = await setup({
      listFeedback: vi.fn(() => Promise.resolve({ items: [], nextCursor: null })),
    });
    expect(text(empty.root)).toContain('No messages');
    TestBed.resetTestingModule();

    const failing = await setup({
      listFeedback: vi
        .fn<AdminApi['listFeedback']>()
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce({ items: [FIRST], nextCursor: 'c1' }),
    });
    expect(failing.root.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't load the messages.",
    );
    Array.from(failing.root.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Try again'))
      ?.click();
    await vi.waitFor(() => {
      expect(text(failing.root)).toContain('Sort by last opened');
    });
    await failing.harness.fixture.whenStable();

    Array.from(failing.root.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Load more'))
      ?.click();
    await vi.waitFor(() => {
      expect(failing.api.listFeedback).toHaveBeenLastCalledWith({ cursor: 'c1', limit: 20 });
    });
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
