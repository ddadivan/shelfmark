import { HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockRediscoverApi } from './mock-rediscover.api';

async function run<T>(source: Observable<T>): Promise<T> {
  const result = firstValueFrom(source);
  await vi.advanceTimersByTimeAsync(2_000);
  return result;
}

function setup() {
  localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: true }));
  const injector = Injector.create({ providers: [MockLibraryData, MockRediscoverApi] });
  return injector.get(MockRediscoverApi);
}

describe('MockRediscoverApi', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('answers a forgotten block of 3 to 5 old links not opened lately, stable within the week', async () => {
    const api = setup();
    const block = await run(api.getBlock());
    expect(block.mode).toBe('forgotten');
    expect(block.theme).toBeNull();
    expect(block.items.length).toBeGreaterThanOrEqual(3);
    expect(block.items.length).toBeLessThanOrEqual(5);
    const monthAgo = Date.now() - 30 * 86_400_000;
    for (const link of block.items) {
      expect(Date.parse(link.createdAt)).toBeLessThanOrEqual(monthAgo);
    }
    expect((await run(api.getBlock())).items.map((l) => l.id)).toEqual(
      block.items.map((l) => l.id),
    );
  });

  it('hides a link for good, 404 for an unknown one, and dismisses for the week', async () => {
    const api = setup();
    const first = (await run(api.getBlock())).items[0];
    await run(api.hide(first?.id ?? ''));
    expect((await run(api.getBlock())).items.map((l) => l.id)).not.toContain(first?.id);
    const missing = expect(firstValueFrom(api.hide('nope'))).rejects.toBeInstanceOf(
      HttpErrorResponse,
    );
    await vi.advanceTimersByTimeAsync(2_000);
    await missing;
    await run(api.dismiss());
    expect(await run(api.getBlock())).toMatchObject({ mode: null, items: [] });
  });
});
