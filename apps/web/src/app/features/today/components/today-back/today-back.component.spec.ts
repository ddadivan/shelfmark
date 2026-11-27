import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { ReminderActionsService } from '../../../reminders/services/reminder-actions.service';
import { ReminderFormatService } from '../../../reminders/services/reminder-format.service';
import { TodayBackComponent } from './today-back.component';

async function setup(loaded: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideTranslocoForTest(),
      { provide: UserSettingsStore, useValue: { openInNewTab: signal(false) } },
      { provide: LinkActionsService, useValue: {} },
      { provide: ReminderActionsService, useValue: {} },
      { provide: ReminderFormatService, useValue: {} },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(TodayBackComponent);
  fixture.componentRef.setInput('links', []);
  fixture.componentRef.setInput('count', 0);
  fixture.componentRef.setInput('loaded', loaded);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('TodayBackComponent loading', () => {
  it('keeps the heading and one placeholder tile of the real size while the reminders load', async () => {
    const element = await setup(false);
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Back to these');
    expect(element.querySelectorAll('.today-back .today-back__item')).toHaveLength(1);
    expect(element.querySelector('.today-back__sk-thumb')).not.toBeNull();
    expect(element.querySelectorAll('.today-back__sk-action')).toHaveLength(2);
    expect(element.querySelector('.today-section__more')).toBeNull();
    expect(element.querySelector('.today-clear')).toBeNull();
  });

  it('shows "All caught up" instead once loaded with nothing due', async () => {
    const element = await setup(true);
    expect(element.querySelector('.today-clear')).not.toBeNull();
    expect(element.querySelector('.today-back__sk-thumb')).toBeNull();
  });
});
