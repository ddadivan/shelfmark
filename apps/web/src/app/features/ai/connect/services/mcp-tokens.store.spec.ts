import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MCP_LIMIT } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { fakeMcpApi, mcpToken } from '../../../../../testing/fake-mcp-api';
import { MCP_API } from '../models/mcp-api.const';
import { MCP_TOKEN_ERROR } from '../models/mcp-token-error.const';
import { McpTokensStore } from './mcp-tokens.store';

const SECRET = 'smk_live_not-a-real-secret';

function setup(api = fakeMcpApi()) {
  TestBed.configureTestingModule({ providers: [{ provide: MCP_API, useValue: api }] });
  return { api, store: TestBed.inject(McpTokensStore) };
}

function failWith(status: number) {
  return throwError(() => new HttpErrorResponse({ status }));
}

describe('McpTokensStore', () => {
  it('loads whether tokens can be created and the list', async () => {
    const token = mcpToken();
    const { store } = setup(fakeMcpApi({ available: true, items: [token] }));
    expect(store.loaded()).toBe(false);
    await store.load();
    expect(store.loaded()).toBe(true);
    expect(store.available()).toBe(true);
    expect(store.items()).toEqual([token]);
    expect(store.empty()).toBe(false);
  });

  it('marks a failed load', async () => {
    const api = fakeMcpApi();
    api.list.mockReturnValue(failWith(500));
    const { store } = setup(api);
    await store.load();
    expect(store.loadFailed()).toBe(true);
    expect(store.loaded()).toBe(false);
  });

  it('creates a token: hands the secret back and lists only the summary', async () => {
    const { api, store } = setup();
    await store.load();
    const token = mcpToken({ id: 'new' });
    api.create.mockReturnValue(of({ token, secret: SECRET }));
    const result = await store.create({ name: 'Claude', includeNotes: false });
    expect(result).toEqual({ ok: true, response: { token, secret: SECRET } });
    expect(store.items()).toEqual([token]);
    expect(JSON.stringify(store.items())).not.toContain(SECRET);
  });

  it.each([
    [409, MCP_TOKEN_ERROR.Limit],
    [403, MCP_TOKEN_ERROR.NotAvailable],
    [500, MCP_TOKEN_ERROR.Save],
    [0, MCP_TOKEN_ERROR.Save],
  ])('maps a %s on create to %s', async (status, error) => {
    const { api, store } = setup();
    await store.load();
    api.create.mockReturnValue(failWith(status));
    expect(await store.create({ name: 'A', includeNotes: false })).toEqual({ ok: false, error });
    expect(store.available()).toBe(error !== MCP_TOKEN_ERROR.NotAvailable);
  });

  it('knows when the limit is reached', async () => {
    const items = Array.from({ length: MCP_LIMIT.TokensPerUserMax }, (_, index) =>
      mcpToken({ id: String(index) }),
    );
    const { store } = setup(fakeMcpApi({ available: true, items }));
    await store.load();
    expect(store.limitReached()).toBe(true);
  });

  it('revokes; a 404 also drops the token; another failure keeps it', async () => {
    const one = mcpToken({ id: 'one' });
    const two = mcpToken({ id: 'two' });
    const three = mcpToken({ id: 'three' });
    const { api, store } = setup(fakeMcpApi({ available: true, items: [one, two, three] }));
    await store.load();

    expect(await store.revoke('one')).toBe(true);
    expect(api.revoke).toHaveBeenCalledWith('one');

    api.revoke.mockReturnValue(failWith(404));
    expect(await store.revoke('two')).toBe(true);

    api.revoke.mockReturnValue(failWith(500));
    expect(await store.revoke('three')).toBe(false);
    expect(store.items()).toEqual([three]);
    expect(store.revokingId()).toBeNull();
  });
});
