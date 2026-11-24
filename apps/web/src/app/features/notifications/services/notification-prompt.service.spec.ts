import { TestBed } from '@angular/core/testing';
import { ToastService } from '@shelfmark/ui';
import { provideTranslocoForTest } from '../../../testing/transloco-testing';
import { NotificationPromptService } from './notification-prompt.service';

class FakeNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn(() => Promise.resolve<NotificationPermission>('granted'));
}

function setup(permission: NotificationPermission | null) {
  if (permission) {
    FakeNotification.permission = permission;
    vi.stubGlobal('Notification', FakeNotification);
  }
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  const toasts = TestBed.inject(ToastService);
  const show = vi.spyOn(toasts, 'show');
  return { prompt: TestBed.inject(NotificationPromptService), show };
}

describe('NotificationPromptService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem('sm-notifications-asked');
  });

  it('asks once the browser was never asked, with Turn on and Not now', () => {
    const { prompt, show } = setup('default');

    expect(prompt.offer('Reminder set for tomorrow, 9:00')).toBe(true);
    const toast = show.mock.calls[0]?.[0];
    expect(toast?.title).toBe('Reminder set for tomorrow, 9:00');
    expect(toast?.action?.label).toBeTruthy();

    toast?.secondary?.run();
    expect(prompt.offer('Again')).toBe(false);
  });

  it('never asks without support or after the browser answered', () => {
    expect(setup(null).prompt.offer('x')).toBe(false);
    TestBed.resetTestingModule();
    expect(setup('denied').prompt.offer('x')).toBe(false);
    TestBed.resetTestingModule();
    expect(setup('granted').prompt.offer('x')).toBe(false);
  });
});
