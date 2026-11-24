import { TestBed } from '@angular/core/testing';
import { RECENT_SEARCHES_STORAGE_KEY } from '../../../core/auth/models/recent-searches-storage-key.const';
import { USER_STORAGE_KEYS } from '../../../core/auth/models/user-storage-keys.const';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { RecentSearchesService } from './recent-searches.service';

describe('RecentSearchesService', () => {
  afterEach(() => localStorage.clear());

  it('keeps the last five searches, newest first, without repeats ignoring case', () => {
    const service = TestBed.inject(RecentSearchesService);

    for (const text of ['one', 'two', 'three', 'four', 'five', 'six', 'TWO']) {
      service.add(text);
    }

    expect(service.items()).toEqual(['TWO', 'six', 'five', 'four', 'three']);
    expect(JSON.parse(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) ?? '[]')).toEqual(
      service.items(),
    );
  });

  it('normalises the text like ?q= and ignores an empty one', () => {
    const service = TestBed.inject(RecentSearchesService);

    service.add('  signal    forms ');
    service.add('   ');

    expect(service.items()).toEqual(['signal forms']);
  });

  it('reads what this device stored and drops anything that is not text', () => {
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(['shoes', 3, null, ' ']));

    expect(TestBed.inject(RecentSearchesService).items()).toEqual(['shoes']);
  });

  it('starts empty with broken storage', () => {
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, '{oops');

    expect(TestBed.inject(RecentSearchesService).items()).toEqual([]);
  });

  it('is forgotten when the session ends', () => {
    const service = TestBed.inject(RecentSearchesService);
    service.add('jacket');

    TestBed.inject(SessionScope).end();

    expect(service.items()).toEqual([]);
    expect(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)).toBeNull();
    expect(USER_STORAGE_KEYS).toContain(RECENT_SEARCHES_STORAGE_KEY);
  });
});
