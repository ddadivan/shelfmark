import { signal, type WritableSignal } from '@angular/core';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { PREVIEW_BODY_KIND } from '../app/features/link-preview/models/preview-body-kind.const';
import type { PreviewBodyKind } from '../app/features/link-preview/models/preview-body-kind.type';
import { linkHost } from '@shelfmark/contracts';

/** The link the preview stub shows by default. */
export const PREVIEW_STUB_LINK: LinkResponse = {
  ...MOCK_LINKS[0],
  id: 'id-1',
  title: 'Angular overview',
  url: 'https://www.angular.dev/overview',
  faviconUrl: null,
  isFavorite: false,
};

/**
 * A stand-in for `LinkPreviewService` for component specs: the readable state is writable
 * signals, every action a spy. `setLink` keeps host, href and body in step with the link.
 */
export function createLinkPreviewStub(link: LinkResponse | null = PREVIEW_STUB_LINK) {
  const current: WritableSignal<LinkResponse | null> = signal(link);
  const body: WritableSignal<PreviewBodyKind> = signal(
    link ? PREVIEW_BODY_KIND.Site : PREVIEW_BODY_KIND.Loading,
  );
  const stub = {
    link: current,
    currentId: signal<string | null>(link?.id ?? null),
    body,
    host: signal(link ? (linkHost(link.url) ?? '') : ''),
    href: signal<string | undefined>(link?.url),
    embedUrl: signal<string | null>(null),
    alwaysNewTab: signal(false),
    previousId: signal<string | null>(null),
    nextId: signal<string | null>(null),
    listHidden: signal(false),
    copied: signal(false),
    listWidth: signal(400),
    split: signal(true),
    pushed: signal(false),
    frameTimedOut: vi.fn(),
    openInNewTab: vi.fn(),
    setAlwaysNewTab: vi.fn(() => Promise.resolve()),
    toggleFavorite: vi.fn(),
    edit: vi.fn(),
    copyLink: vi.fn(() => Promise.resolve()),
    share: vi.fn(() => Promise.resolve()),
    toggleList: vi.fn(),
    go: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };
  return stub;
}

export type LinkPreviewStub = ReturnType<typeof createLinkPreviewStub>;
