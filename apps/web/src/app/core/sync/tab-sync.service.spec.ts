import { DOCUMENT } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AuthUser } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { TagsStore } from '../../stores/tags.store';
import { TrashStore } from '../../stores/trash.store';
import { AuthStore } from '../auth/auth.store';
import { TAB_SYNC_KIND } from './models/tab-sync-kind.const';
import { SignedOutLockService } from './signed-out-lock.service';
import { TabSyncService } from './tab-sync.service';

/** In-memory stand-in: every instance with the same name receives what the others post. */
class FakeChannel {
  static readonly all: FakeChannel[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly posted: unknown[] = [];
  closed = false;

  constructor(readonly name: string) {
    FakeChannel.all.push(this);
  }

  postMessage(data: unknown): void {
    this.posted.push(data);
  }

  close(): void {
    this.closed = true;
  }

  /** Delivers `data` as if another tab posted it. */
  deliver(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

const USER = { id: 'user-a' } as AuthUser;

function setup(user: AuthUser | null = USER) {
  FakeChannel.all.length = 0;
  vi.stubGlobal('BroadcastChannel', FakeChannel);
  const current = signal<AuthUser | null>(user);
  const auth = { user: current, loaded: () => true, expireSession: vi.fn(() => current.set(null)) };
  const links = { addSaved: vi.fn(), applyEdit: vi.fn(), applyRemoval: vi.fn(), refresh: vi.fn() };
  const folders = { refresh: vi.fn(() => Promise.resolve()) };
  const tags = { refresh: vi.fn(() => Promise.resolve()) };
  const trash = { refresh: vi.fn(() => Promise.resolve()) };
  const lock = { lock: vi.fn(() => Promise.resolve()) };
  const reload = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: auth },
      { provide: LinksStore, useValue: links },
      { provide: FoldersStore, useValue: folders },
      { provide: TagsStore, useValue: tags },
      { provide: TrashStore, useValue: trash },
      { provide: SignedOutLockService, useValue: lock },
    ],
  });
  const view = TestBed.inject(DOCUMENT).defaultView;
  if (view) {
    vi.spyOn(view, 'location', 'get').mockReturnValue({ reload } as unknown as Location);
  }
  const sync = TestBed.inject(TabSyncService);
  sync.init();
  const channel = FakeChannel.all[0];
  if (!channel) {
    throw new Error('no channel opened');
  }
  return { sync, channel, auth, links, folders, tags, trash, lock, reload };
}

describe('TabSyncService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('opens one channel and posts with the signed-in user id', () => {
    const { sync, channel } = setup();
    sync.init();

    sync.post({ kind: TAB_SYNC_KIND.LibraryChanged });

    expect(FakeChannel.all).toHaveLength(1);
    expect(channel.posted).toEqual([{ kind: TAB_SYNC_KIND.LibraryChanged, userId: USER.id }]);
  });

  it('posts nothing for a guest', () => {
    const { sync, channel } = setup(null);

    sync.post({ kind: TAB_SYNC_KIND.LibraryChanged });

    expect(channel.posted).toEqual([]);
  });

  it('shows a link saved in another tab and refreshes the sidebar', () => {
    const { channel, links, folders, tags } = setup();
    const link = MOCK_LINKS[0];

    channel.deliver({ kind: TAB_SYNC_KIND.LinkSaved, link, userId: USER.id });

    expect(links.addSaved).toHaveBeenCalledWith(link);
    expect(folders.refresh).toHaveBeenCalled();
    expect(tags.refresh).toHaveBeenCalled();
    expect(links.refresh).not.toHaveBeenCalled();
  });

  it('applies edits and deletes silently', () => {
    const { channel, links } = setup();
    const link = MOCK_LINKS[1];

    channel.deliver({ kind: TAB_SYNC_KIND.LinkChanged, link, userId: USER.id });
    channel.deliver({ kind: TAB_SYNC_KIND.LinkRemoved, id: link.id, userId: USER.id });

    expect(links.applyEdit).toHaveBeenCalledWith(link);
    expect(links.applyRemoval).toHaveBeenCalledWith(link.id);
  });

  it('reloads the feed and Trash when folders, tags or Trash changed', () => {
    const { channel, links, trash } = setup();

    channel.deliver({ kind: TAB_SYNC_KIND.LibraryChanged, userId: USER.id });

    expect(links.refresh).toHaveBeenCalled();
    expect(trash.refresh).toHaveBeenCalled();
  });

  it('ignores messages about another account and malformed ones', () => {
    const { channel, links, auth } = setup();

    channel.deliver({ kind: TAB_SYNC_KIND.LinkRemoved, id: 'x', userId: 'user-b' });
    channel.deliver({ kind: TAB_SYNC_KIND.SignedOut, userId: 'user-b' });
    channel.deliver({ kind: 'nonsense', userId: USER.id });

    expect(links.applyRemoval).not.toHaveBeenCalled();
    expect(auth.expireSession).not.toHaveBeenCalled();
  });

  it('locks this tab when the same user signed out in another one', () => {
    const { channel, auth, lock } = setup();

    channel.deliver({ kind: TAB_SYNC_KIND.SignedOut, userId: USER.id });

    expect(auth.expireSession).toHaveBeenCalled();
    expect(lock.lock).toHaveBeenCalled();
  });

  it('reloads a signed-out tab when someone signs in, but not a tab of the same user', () => {
    const signedIn = setup();
    signedIn.channel.deliver({ kind: TAB_SYNC_KIND.SignedIn, userId: USER.id });
    expect(signedIn.reload).not.toHaveBeenCalled();

    signedIn.channel.deliver({ kind: TAB_SYNC_KIND.SignedIn, userId: 'user-b' });
    expect(signedIn.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads a guest tab when a user signs in elsewhere', () => {
    TestBed.resetTestingModule();
    const guest = setup(null);

    guest.channel.deliver({ kind: TAB_SYNC_KIND.SignedIn, userId: USER.id });

    expect(guest.reload).toHaveBeenCalled();
  });
});
