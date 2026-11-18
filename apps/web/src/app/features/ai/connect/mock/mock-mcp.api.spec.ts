import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MCP_LIMIT, MCP_TOKEN_PREFIX } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { MOCK_AI_STORAGE_KEY } from '../../mock/models/mock-ai-storage-key.const';
import { MockMcpApi } from './mock-mcp.api';
import { MOCK_MCP_STORAGE_KEY } from './models/mock-mcp-storage-key.const';

function setup(isDemo = false): MockMcpApi {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthStore, useValue: { user: signal({ name: 'Ada', isDemo }) } }],
  });
  return TestBed.inject(MockMcpApi);
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    return 0;
  } catch (error) {
    return error instanceof HttpErrorResponse ? error.status : -1;
  }
}

describe('MockMcpApi', () => {
  afterEach(() => {
    localStorage.removeItem(MOCK_MCP_STORAGE_KEY);
    localStorage.removeItem(MOCK_AI_STORAGE_KEY);
  });

  it('creates a token, answers the secret once and keeps only the summary', async () => {
    const api = setup();
    expect(await firstValueFrom(api.list())).toEqual({ available: true, items: [] });

    const created = await firstValueFrom(api.create({ name: '  Claude  ', includeNotes: true }));
    expect(created.secret.startsWith(`${MCP_TOKEN_PREFIX}mock`)).toBe(true);
    expect(created.secret).toHaveLength(MCP_TOKEN_PREFIX.length + 43);
    expect(created.token).toMatchObject({
      name: 'Claude',
      last4: created.secret.slice(-4),
      includeNotes: true,
      lastUsedAt: null,
      callsThisWeek: 0,
    });
    expect(localStorage.getItem(MOCK_MCP_STORAGE_KEY)).not.toContain(created.secret);

    const list = await firstValueFrom(api.list());
    expect(list.items).toEqual([created.token]);
    expect(JSON.stringify(list)).not.toContain(created.secret);
  });

  it('lists the newest first and revokes; an unknown id is 404', async () => {
    const api = setup();
    const first = await firstValueFrom(api.create({ name: 'One', includeNotes: false }));
    const second = await firstValueFrom(api.create({ name: 'Two', includeNotes: false }));
    expect((await firstValueFrom(api.list())).items.map((item) => item.name)).toEqual([
      'Two',
      'One',
    ]);

    await firstValueFrom(api.revoke(second.token.id), { defaultValue: undefined });
    expect((await firstValueFrom(api.list())).items).toEqual([first.token]);
    expect(await statusOf(firstValueFrom(api.revoke(second.token.id)))).toBe(404);
  });

  it('refuses a blank or long name, and more than the limit', async () => {
    const api = setup();
    expect(await statusOf(firstValueFrom(api.create({ name: '  ', includeNotes: false })))).toBe(
      400,
    );
    expect(
      await statusOf(
        firstValueFrom(
          api.create({ name: 'x'.repeat(MCP_LIMIT.NameMax + 1), includeNotes: false }),
        ),
      ),
    ).toBe(400);
    for (let index = 0; index < MCP_LIMIT.TokensPerUserMax; index++) {
      await firstValueFrom(api.create({ name: `Token ${index}`, includeNotes: false }));
    }
    expect(
      await statusOf(firstValueFrom(api.create({ name: 'One more', includeNotes: false }))),
    ).toBe(409);
  });

  it('is not available to the demo or a Free account (403 on create)', async () => {
    const demo = setup(true);
    expect((await firstValueFrom(demo.list())).available).toBe(false);
    expect(await statusOf(firstValueFrom(demo.create({ name: 'A', includeNotes: false })))).toBe(
      403,
    );

    TestBed.resetTestingModule();
    localStorage.setItem(MOCK_AI_STORAGE_KEY, JSON.stringify({ tier: 'free' }));
    const free = setup();
    expect((await firstValueFrom(free.list())).available).toBe(false);
    expect(await statusOf(firstValueFrom(free.create({ name: 'A', includeNotes: false })))).toBe(
      403,
    );
  });

  it('reads broken storage as no tokens', async () => {
    localStorage.setItem(MOCK_MCP_STORAGE_KEY, '{nope');
    expect((await firstValueFrom(setup().list())).items).toEqual([]);
  });
});
